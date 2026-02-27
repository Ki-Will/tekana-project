import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Incident,
  IncidentStatus,
  MediaType,
  NotificationChannel,
  NotificationType,
  Prisma,
  ResponderActionType,
  ActionStatus,
  UserRole,
  Severity,
} from '@prisma/client';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentStatusDto } from './dto/update-incident-status.dto';
import { AssignResponderDto } from './dto/assign-responder.dto';
import { FilterIncidentsDto } from './dto/filter-incidents.dto';
import { RequestEmergencyServiceDto } from './dto/request-emergency-service.dto';
import { RabbitMQService } from '../messaging/rabbitmq.service';
import { RedisService } from '../redis/redis.service';
import { FcmService } from '../messaging/fcm.service';
import { SmsService } from '../sms/sms.service';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
import { MapsService } from '../maps/maps.service';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);

  constructor(
    private prisma: PrismaService,
    private rabbitMQService: RabbitMQService,
    private redisService: RedisService,
    private fcmService: FcmService,
    private smsService: SmsService,
    private auditService: AuditService,
    private emailService: EmailService,
    private mapsService: MapsService,
  ) {}

  async createIncident(userId: string, dto: CreateIncidentDto): Promise<Incident> {
    const pathGuardSession = dto.pathGuardSessionId
      ? await this.prisma.pathGuardSession.findUnique({
          where: { id: dto.pathGuardSessionId },
        })
      : null;

    if (dto.pathGuardSessionId && !pathGuardSession) {
      throw new NotFoundException('PathGuard session not found');
    }

    // Auto-fill locationAddress if not provided
    let locationAddress = dto.locationAddress;
    if (!locationAddress) {
      locationAddress = await this.mapsService.reverseGeocode(dto.locationLat, dto.locationLng) || undefined;
    }

    const incident = await this.prisma.incident.create({
      data: {
        userId,
        type: dto.type,
        severity: dto.severity ?? undefined,
        title: dto.title,
        description: dto.description,
        locationLat: dto.locationLat,
        locationLng: dto.locationLng,
        locationAddress,
        isSilentSOS: dto.isSilentSOS ?? undefined,
        isOfflineAlert: dto.isOfflineAlert ?? undefined,
        streamKey: uuidv4(),
      },
      include: this.defaultIncidentInclude(),
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] Incident received and created: ${incident.id} by user ${userId}`);
    }

    // Auto-assign nearby available responders
    await this.autoAssignResponders(incident);

    await this.cacheIncident(incident);
    await this.invalidateIncidentLists();

    await this.publishEvent('incident.created', {
      incidentId: incident.id,
      userId: incident.userId,
      type: incident.type,
      severity: incident.severity,
      status: incident.status,
      location: {
        lat: incident.locationLat,
        lng: incident.locationLng,
      },
      silent: incident.isSilentSOS,
      offline: incident.isOfflineAlert,
      createdAt: incident.createdAt,
    });

    if (dto.pathGuardSessionId) {
      await this.prisma.pathGuardSession.update({
        where: { id: dto.pathGuardSessionId },
        data: {
          incidentId: incident.id,
          emergencyTriggered: true,
        },
      });
    }

    const notifications = this.buildNotificationsForIncident(incident);

    await this.prisma.notification.createMany({
      data: notifications,
    });

    // Send SMS to trusted contacts
    const userWithTrusted = await this.prisma.user.findUnique({
      where: { id: incident.userId },
      include: { trustedContacts: true },
    });
    if (userWithTrusted?.trustedContacts.length) {
      for (const contact of userWithTrusted.trustedContacts) {
        await this.smsService.sendSms(
          contact.contactPhone,
          `Emergency Alert: Incident reported by ${userWithTrusted.name}. Please check for updates.`,
        );
      }
    }

    for (const notification of notifications) {
      await this.dispatchNotification({
        userId: notification.userId,
        incidentId: notification.incidentId ?? undefined,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        channels: notification.channels,
        data: {
          incidentId: incident.id,
        },
      });
    }

    await this.auditService.logAction({
      userId,
      action: 'INCIDENT_CREATED',
      resource: 'INCIDENT',
      resourceId: incident.id,
    });

    return incident;
  }

  async getIncidentById(id: string): Promise<Incident> {
    const cacheKey = this.buildIncidentCacheKey(id);
    const cached = await this.redisService.get<Incident>(cacheKey);

    if (cached) {
      return cached;
    }

    const incident = await this.prisma.incident.findUnique({
      where: { id },
      include: this.defaultIncidentInclude(),
    });

    if (!incident) {
      throw new NotFoundException('Incident not found');
    }

    await this.cacheIncident(incident);

    return incident;
  }

  async getIncidents(filter: FilterIncidentsDto, pagination?: { skip?: number; take?: number }) {
    const cacheKey = this.buildIncidentListCacheKey(filter, pagination);
    const cached = await this.redisService.get<{ incidents: Incident[]; total: number }>(cacheKey);

    if (cached) {
      return cached;
    }

    const where: Prisma.IncidentWhereInput = {};

    if (filter.status) where.status = filter.status;
    if (filter.type) where.type = filter.type;
    if (filter.severity) where.severity = filter.severity;
    if (typeof filter.isSilentSOS === 'boolean') where.isSilentSOS = filter.isSilentSOS;
    if (typeof filter.isOfflineAlert === 'boolean') where.isOfflineAlert = filter.isOfflineAlert;
    if (filter.userId) where.userId = filter.userId;
    if (filter.responderId) {
      where.responderActions = {
        some: {
          responderId: filter.responderId,
        },
      };
    }

    const [incidents, total] = await Promise.all([
      this.prisma.incident.findMany({
        where,
        skip: pagination?.skip,
        take: pagination?.take,
        orderBy: { createdAt: 'desc' },
        include: this.defaultIncidentInclude(),
      }),
      this.prisma.incident.count({ where }),
    ]);

    const result = { incidents, total };
    await this.redisService.set(cacheKey, result);

    return result;
  }

  async updateIncidentStatus(id: string, dto: UpdateIncidentStatusDto, currentUserId: string): Promise<Incident> {
    const incident = await this.getIncidentById(id);

    const user = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      select: { role: true },
    });

    if (!user) {
      throw new ForbiddenException('Unauthorized');
    }

    if (user.role === UserRole.CITIZEN && incident.userId !== currentUserId) {
      throw new ForbiddenException('Citizens can only update their own incidents');
    }

    const data: Prisma.IncidentUpdateInput = {
      status: dto.status,
      severity: dto.severity ?? undefined,
      updatedAt: new Date(),
    };

    if (dto.status === IncidentStatus.RESOLVED) {
      data.resolvedAt = new Date();
    }

    await this.auditService.logAction({
      userId: currentUserId,
      action: 'INCIDENT_STATUS_UPDATED',
      resource: 'INCIDENT',
      resourceId: id,
      oldValues: { status: incident.status },
      newValues: { status: dto.status },
    });

    const statusNotification = {
      userId: incident.userId,
      incidentId: incident.id,
      type: dto.status === IncidentStatus.RESOLVED ? NotificationType.INCIDENT_RESOLVED : NotificationType.SOS_ALERT,
      title: `Incident status updated to ${dto.status}`,
      message: dto.notes ?? `Incident status changed to ${dto.status}`,
      channels: [NotificationChannel.PUSH_NOTIFICATION, NotificationChannel.IN_APP] as NotificationChannel[],
    };

    await this.prisma.notification.create({
      data: statusNotification,
    });

    await this.dispatchNotification({
      ...statusNotification,
      incidentId: statusNotification.incidentId ?? undefined,
    });

    let updatedIncident: Incident;
    try {
      updatedIncident = await this.prisma.incident.update({
        where: { id },
        data,
        include: this.defaultIncidentInclude(),
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Incident not found');
      }
      throw error;
    }

    await this.cacheIncident(updatedIncident);
    await this.invalidateIncidentLists();

    await this.publishEvent('incident.status.updated', {
      incidentId: updatedIncident.id,
      userId: updatedIncident.userId,
      status: updatedIncident.status,
      severity: updatedIncident.severity,
      updatedBy: currentUserId,
      notes: dto.notes,
      resolvedAt: updatedIncident.resolvedAt,
    });

    return updatedIncident;
  }

  async assignResponder(incidentId: string, dto: AssignResponderDto) {
    const incident = await this.getIncidentById(incidentId);

    const responderProfile = await this.prisma.responderProfile.findUnique({
      where: { id: dto.responderId },
      include: { user: true },
    });

    if (!responderProfile) {
      throw new NotFoundException('Responder not found');
    }

    const action = await this.prisma.responderAction.create({
      data: {
        incidentId: incident.id,
        responderId: responderProfile.id,
        actionType: ResponderActionType.DISPATCHED,
        status: ActionStatus.IN_PROGRESS,
        notes: dto.notes,
      },
      include: {
        responder: {
          include: {
            user: true,
          },
        },
      },
    });

    const responderNotification = {
      userId: responderProfile.userId,
      incidentId: incident.id,
      type: NotificationType.RESPONDER_DISPATCHED,
      title: 'New incident assigned',
      message: `You have been assigned to incident ${incident.id}`,
      channels: [
        NotificationChannel.PUSH_NOTIFICATION,
        NotificationChannel.SMS,
        NotificationChannel.IN_APP,
      ] as NotificationChannel[],
    };

    await this.prisma.notification.create({
      data: responderNotification,
    });

    await this.dispatchNotification({
      ...responderNotification,
      incidentId: responderNotification.incidentId ?? undefined,
      data: {
        responderActionId: action.id,
        incidentId: incident.id,
      },
    });

    await this.auditService.logAction({
      userId: responderProfile.userId,
      action: 'RESPONDER_ASSIGNED',
      resource: 'RESPONDER_ACTION',
      resourceId: action.id,
    });

    await this.cacheIncident(incident);
    await this.invalidateIncidentLists();

    await this.publishEvent('incident.responder.assigned', {
      incidentId: incident.id,
      responderId: responderProfile.id,
      responderUserId: responderProfile.userId,
      actionId: action.id,
      notes: dto.notes,
    });

    return action;
  }

  async addMediaToIncident(incidentId: string, fileData: { type: MediaType; filePath: string; fileName: string; fileSize: number; duration?: number; thumbnailPath?: string; encryptionKey?: string; }) {
    await this.getIncidentById(incidentId);

    return this.prisma.mediaFile.create({
      data: {
        incidentId,
        type: fileData.type,
        filePath: fileData.filePath,
        fileName: fileData.fileName,
        fileSize: fileData.fileSize,
        duration: fileData.duration,
        thumbnailPath: fileData.thumbnailPath,
        encryptionKey: fileData.encryptionKey,
      },
    });
  }

  private defaultIncidentInclude() {
    return {
      user: {
        select: {
          id: true,
          name: true,
          phone: true,
          role: true,
        },
      },
      mediaFiles: true,
      responderActions: {
        include: {
          responder: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                },
              },
            },
          },
        },
      },
      notifications: true,
    } satisfies Prisma.IncidentInclude;
  }

  private buildNotificationsForIncident(incident: Incident) {
    const notifications = [
      {
        userId: incident.userId,
        incidentId: incident.id,
        type: NotificationType.SOS_ALERT,
        title: 'SOS Alert Sent',
        message: 'Your emergency alert has been sent. Help is on the way.',
        channels: [NotificationChannel.PUSH_NOTIFICATION, NotificationChannel.IN_APP] as NotificationChannel[],
        sentAt: new Date(),
      },
    ];

    return notifications;
  }

  private async dispatchNotification(params: {
    userId: string;
    incidentId?: string;
    type: NotificationType;
    title: string;
    message: string;
    channels: NotificationChannel[];
    data?: Record<string, string>;
  }): Promise<void> {
    // Handle Push Notifications
    if (params.channels.includes(NotificationChannel.PUSH_NOTIFICATION)) {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[DEV] Sending push notification to user ${params.userId} for incident ${params.incidentId || 'N/A'}`);
        }
        const tokens = await this.prisma.deviceToken.findMany({
          where: {
            userId: params.userId,
            isActive: true,
          },
          select: { token: true },
        });

        const registrationTokens = tokens.map((token) => token.token).filter(Boolean);

        if (!registrationTokens.length) {
          this.logger.warn(`No active device tokens for user ${params.userId}`);
        } else {
          const dataPayload: Record<string, string> = {
            notificationType: params.type,
            ...(params.data ?? {}),
          };

          if (params.incidentId) {
            dataPayload.incidentId = params.incidentId;
          }

          await this.fcmService.sendToTokens(
            registrationTokens,
            {
              title: params.title,
              body: params.message,
            },
            dataPayload,
          );
        }
      } catch (error) {
        this.logger.error(`Failed to dispatch push notification for user ${params.userId}`, error as Error);
      }
    }

    // Handle SMS Notifications
    if (params.channels.includes(NotificationChannel.SMS)) {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[DEV] Sending SMS notification to user ${params.userId} for incident ${params.incidentId || 'N/A'}`);
        }
        const user = await this.prisma.user.findUnique({
          where: { id: params.userId },
          select: { phone: true },
        });

        if (user?.phone) {
          await this.smsService.sendSms(user.phone, params.message);
        } else {
          this.logger.warn(`No phone number for user ${params.userId}`);
        }
      } catch (error) {
        this.logger.error(`Failed to dispatch SMS notification for user ${params.userId}`, error as Error);
      }
    }

    // Handle Email Notifications
    if (params.channels.includes(NotificationChannel.EMAIL)) {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[DEV] Sending email notification to user ${params.userId} for incident ${params.incidentId || 'N/A'}`);
        }
        await this.emailService.sendEmail(`${params.userId}@example.com`, params.title, params.message);
      } catch (error) {
        this.logger.error(`Failed to send email notification to user ${params.userId}`, error as Error);
      }
    }

    // Handle USSD Notifications (stub)
    if (params.channels.includes(NotificationChannel.USSD)) {
      this.logger.log(`USSD notification stub: ${params.message} to user ${params.userId}`);
      // TODO: Implement USSD service
    }

    // In-app notifications are handled by creating the notification record
  }

  private async publishEvent(routingKey: string, payload: Record<string, unknown>) {
    try {
      await this.rabbitMQService.publish(routingKey, payload);
    } catch (error) {
      // We log but do not block main flow if messaging fails
      this.logger.error(`Failed to publish RabbitMQ event ${routingKey}`, error as Error);
    }
  }

  private buildIncidentCacheKey(id: string) {
    return `incidents:detail:${id}`;
  }

  private buildIncidentListCacheKey(
    filter: FilterIncidentsDto,
    pagination?: { skip?: number; take?: number },
  ) {
    const key = JSON.stringify({ filter, pagination });
    return `incidents:list:${key}`;
  }

  private async cacheIncident(incident: Incident) {
    const cacheKey = this.buildIncidentCacheKey(incident.id);
    await this.redisService.set(cacheKey, incident);
  }

  private async invalidateIncidentLists() {
    await this.redisService.flushByPattern('incidents:list:*');
  }

  private async autoAssignResponders(incident: Incident) {
    // Calculate search radius based on severity
    let radius = 5000; // Default 5km
    switch (incident.severity) {
      case Severity.CRITICAL:
        radius = 10000; // 10km for critical incidents
        break;
      case Severity.HIGH:
        radius = 7500; // 7.5km for high severity
        break;
      case Severity.MEDIUM:
        radius = 5000; // 5km for medium
        break;
      case Severity.LOW:
        radius = 3000; // 3km for low severity
        break;
    }

    const nearbyResponders = await this.findNearbyAvailableResponders(incident.locationLat, incident.locationLng, radius);

    if (nearbyResponders.length > 0) {
      // Update incident status to dispatched
      await this.prisma.incident.update({
        where: { id: incident.id },
        data: { status: IncidentStatus.RESPONDERS_DISPATCHED },
      });

      for (const responder of nearbyResponders) {
        // Check if responder already has active assignments
        const activeActions = await this.prisma.responderAction.findMany({
          where: {
            responderId: responder.id,
            status: { in: [ActionStatus.PENDING, ActionStatus.IN_PROGRESS] }
          }
        });

        if (activeActions.length > 0) {
          this.logger.log(`Skipping responder ${responder.userId} - already has active assignments`);
          continue;
        }

        const action = await this.prisma.responderAction.create({
          data: {
            incidentId: incident.id,
            responderId: responder.id,
            actionType: ResponderActionType.DISPATCHED,
            status: ActionStatus.IN_PROGRESS,
          },
        });

        // Send notification to responder
        const notification = {
          userId: responder.userId,
          incidentId: incident.id,
          type: NotificationType.RESPONDER_DISPATCHED,
          title: 'New incident assigned',
          message: `You have been assigned to incident ${incident.id} at ${incident.locationAddress || 'unknown location'}`,
          channels: [NotificationChannel.PUSH_NOTIFICATION, NotificationChannel.IN_APP] as NotificationChannel[],
        };

        await this.prisma.notification.create({
          data: notification,
        });

        await this.dispatchNotification({
          ...notification,
          incidentId: notification.incidentId ?? undefined,
          data: {
            responderActionId: action.id,
            incidentId: incident.id,
          },
        });

        this.logger.log(`Auto-assigned responder ${responder.userId} to incident ${incident.id}`);
      }
    }
  }

  private async findNearbyAvailableResponders(lat: number, lng: number, radius: number = 5000): Promise<any[]> {
    const responders = await this.prisma.responderProfile.findMany({
      where: {
        isAvailable: true,
        isVerified: true,
        user: {
          isActive: true,
          role: { in: ['COMMUNITY_RESPONDER', 'POLICE_OFFICER', 'MEDICAL_RESPONDER', 'FIRE_RESPONDER'] },
        },
      },
      include: {
        user: { select: { id: true } },
      },
    });

    const nearby = responders.filter(responder => {
      if (!responder.currentLocationLat || !responder.currentLocationLng) return false;
      const distance = this.haversineDistance(lat, lng, responder.currentLocationLat, responder.currentLocationLng);
      return distance <= radius;
    });

    return nearby;
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; // Return in meters
  }

  private toRadians(value: number): number {
    return (value * Math.PI) / 180;
  }

  async requestEmergencyService(incidentId: string, dto: RequestEmergencyServiceDto, userId: string) {
    const incident = await this.getIncidentById(incidentId);

    // Determine emergency service phone number
    const phoneNumber = dto.type === 'ambulance'
      ? process.env.EMERGENCY_AMBULANCE_PHONE || '112' // Default to emergency number
      : process.env.EMERGENCY_POLICE_PHONE || '911'; // Default to emergency number

    const message = `Emergency ${dto.type} request for incident ${incident.id} at ${incident.locationAddress || 'location unknown'}. Notes: ${dto.notes || 'None'}. Requested by user ${userId}.`;

    this.logger.log(`Emergency ${dto.type} request prepared for incident ${incidentId} by user ${userId}`);

    // Create a notification for the incident user
    await this.prisma.notification.create({
      data: {
        userId: incident.userId,
        incidentId: incident.id,
        type: NotificationType.SYSTEM_ANNOUNCEMENT,
        title: `Emergency ${dto.type} request prepared`,
        message: `An emergency ${dto.type} call is being forwarded.`,
        channels: [NotificationChannel.IN_APP],
      },
    });

    // Return data for frontend to handle the call forwarding
    return {
      phoneNumber,
      message,
      type: dto.type,
    };
  }
}
