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
} from '@prisma/client';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentStatusDto } from './dto/update-incident-status.dto';
import { AssignResponderDto } from './dto/assign-responder.dto';
import { FilterIncidentsDto } from './dto/filter-incidents.dto';
import { RabbitMQService } from '../messaging/rabbitmq.service';
import { RedisService } from '../redis/redis.service';
import { FcmService } from '../messaging/fcm.service';
import { SmsService } from '../sms/sms.service';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
import { v4 as uuidv4 } from 'uuid';

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

    const incident = await this.prisma.incident.create({
      data: {
        userId,
        type: dto.type,
        severity: dto.severity ?? undefined,
        title: dto.title,
        description: dto.description,
        locationLat: dto.locationLat,
        locationLng: dto.locationLng,
        locationAddress: dto.locationAddress,
        isSilentSOS: dto.isSilentSOS ?? undefined,
        isOfflineAlert: dto.isOfflineAlert ?? undefined,
        streamKey: uuidv4(),
      },
      include: this.defaultIncidentInclude(),
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] Incident received and created: ${incident.id} by user ${userId}`);
    }

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

    const updatedIncident = await this.prisma.incident.update({
      where: { id },
      data,
      include: this.defaultIncidentInclude(),
    });

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
}
