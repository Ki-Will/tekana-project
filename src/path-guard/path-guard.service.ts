import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IncidentType,
  NotificationChannel,
  NotificationType,
  PathGuardSession,
  Prisma,
  Severity,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StartPathGuardDto } from './dto/start-path-guard.dto';
import { UpdatePathGuardLocationDto } from './dto/update-path-guard-location.dto';
import { IncidentsService } from '../incidents/incidents.service';
import { CreateIncidentDto } from '../incidents/dto/create-incident.dto';
import { FcmService } from '../messaging/fcm.service';
import { MapsService } from '../maps/maps.service';

const EARTH_RADIUS_METERS = 6_371_000;

export interface PathGuardLocationUpdateResult {
  location: Prisma.LocationUpdateCreateWithoutPathGuardSessionInput & { timestamp: Date };
  triggered: boolean;
  incidentId?: string;
  reason?: string;
}

@Injectable()
export class PathGuardService {
  private readonly logger = new Logger(PathGuardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly incidentsService: IncidentsService,
    private readonly fcmService: FcmService,
    private readonly mapsService: MapsService,
  ) {}

  async startSession(userId: string, dto: StartPathGuardDto) {
    const existing = await this.prisma.pathGuardSession.findFirst({
      where: { userId, isActive: true },
    });

    if (existing) {
      throw new ConflictException('An active PathGuard session already exists.');
    }

    const deviationThreshold = dto.deviationThreshold ?? this.getDefaultDeviationThreshold();
    const immobilityTimeout = dto.immobilityTimeout ?? this.getDefaultImmobilityTimeout();

    return this.prisma.pathGuardSession.create({
      data: {
        userId,
        startLocationLat: dto.startLocationLat,
        startLocationLng: dto.startLocationLng,
        destinationLat: dto.destinationLat,
        destinationLng: dto.destinationLng,
        deviationThreshold,
        immobilityTimeout,
        lastActivityAt: new Date(),
      },
    });
  }

  async getActiveSession(userId: string) {
    return this.prisma.pathGuardSession.findFirst({
      where: { userId, isActive: true },
      include: {
        locationUpdates: {
          orderBy: { timestamp: 'desc' },
          take: 5,
        },
      },
    });
  }

  async completeSession(userId: string, sessionId: string) {
    const session = await this.prisma.pathGuardSession.findUnique({ where: { id: sessionId } });

    if (!session || session.userId !== userId) {
      throw new NotFoundException('PathGuard session not found.');
    }

    if (!session.isActive) {
      return session;
    }

    return this.prisma.pathGuardSession.update({
      where: { id: sessionId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });
  }

  async updateLocation(userId: string, sessionId: string, dto: UpdatePathGuardLocationDto): Promise<PathGuardLocationUpdateResult> {
    const session = await this.prisma.pathGuardSession.findUnique({ where: { id: sessionId } });

    if (!session) {
      throw new NotFoundException('PathGuard session not found.');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('You are not allowed to update this session.');
    }

    if (!session.isActive) {
      throw new ConflictException('PathGuard session is no longer active.');
    }

    const previousLocation = await this.prisma.locationUpdate.findFirst({
      where: { pathGuardSessionId: sessionId },
      orderBy: { timestamp: 'desc' },
    });

    const location = await this.prisma.locationUpdate.create({
      data: {
        pathGuardSessionId: sessionId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        speed: dto.speed,
        heading: dto.heading,
        accuracy: dto.accuracy,
      },
    });

    const now = new Date();
    let lastActivityAt = session.lastActivityAt ?? session.createdAt;
    const movementThreshold = this.getMovementThresholdMeters();
    const speedThreshold = this.getMovementSpeedThreshold();

    const distanceFromLast = previousLocation
      ? this.haversineDistanceMeters(previousLocation.latitude, previousLocation.longitude, dto.latitude, dto.longitude)
      : 0;

    const hasMovement = distanceFromLast >= movementThreshold || (dto.speed ?? 0) >= speedThreshold;

    if (hasMovement) {
      await this.prisma.pathGuardSession.update({
        where: { id: sessionId },
        data: { lastActivityAt: now },
      });
      lastActivityAt = now;
    }

    const immobilityTimeout = session.immobilityTimeout ?? this.getDefaultImmobilityTimeout();
    const secondsOfInactivity = (now.getTime() - lastActivityAt.getTime()) / 1000;
    let reason: string | undefined;

    if (!hasMovement && secondsOfInactivity >= immobilityTimeout) {
      reason = `No movement detected for ${Math.round(secondsOfInactivity)} seconds.`;
    }

    if (!reason && session.destinationLat !== null && session.destinationLng !== null) {
      const deviationThreshold = session.deviationThreshold ?? this.getDefaultDeviationThreshold();
      const distanceFromPath = this.distanceFromPathMeters(
        session.startLocationLat,
        session.startLocationLng,
        session.destinationLat,
        session.destinationLng,
        dto.latitude,
        dto.longitude,
      );

      if (distanceFromPath >= deviationThreshold) {
        reason = `Route deviation detected (${Math.round(distanceFromPath)}m off the expected path).`;
      }
    }

    if (!reason) {
      return {
        location: { ...location, timestamp: location.timestamp ?? now },
        triggered: false,
      };
    }

    const incident = await this.handleEmergencyTrigger(session, reason, dto.latitude, dto.longitude);

    return {
      location: { ...location, timestamp: location.timestamp ?? now },
      triggered: true,
      incidentId: incident.incidentId,
      reason,
    };
  }

  private async handleEmergencyTrigger(
    session: PathGuardSession,
    reason: string,
    latitude: number,
    longitude: number,
  ): Promise<{ incidentId: string }> {
    if (session.emergencyTriggered && session.incidentId) {
      return { incidentId: session.incidentId };
    }

    await this.prisma.pathGuardSession.update({
      where: { id: session.id },
      data: {
        isActive: false,
        emergencyTriggered: true,
        updatedAt: new Date(),
      },
    });

    const locationAddress = (await this.mapsService.reverseGeocode(latitude, longitude)) || undefined;

    const incidentPayload: CreateIncidentDto = {
      type: IncidentType.OTHER,
      severity: Severity.CRITICAL,
      title: 'PathGuard Emergency Alert',
      description: reason,
      locationLat: latitude,
      locationLng: longitude,
      locationAddress,
      isSilentSOS: true,
      isOfflineAlert: false,
      pathGuardSessionId: session.id,
    };

    const incident = await this.incidentsService.createIncident(session.userId, incidentPayload);

    await this.notifyUser(session.userId, incident.id, reason);

    this.logger.warn(`PathGuard emergency triggered for session ${session.id}: ${reason}`);

    return { incidentId: incident.id };
  }

  private async notifyUser(userId: string, incidentId: string, reason: string): Promise<void> {
    const title = 'PathGuard Emergency Detected';
    const message = reason;

    await this.prisma.notification.create({
      data: {
        userId,
        incidentId,
        type: NotificationType.PATH_GUARD_ALERT,
        title,
        message,
        channels: [NotificationChannel.PUSH_NOTIFICATION, NotificationChannel.IN_APP],
      },
    });

    const tokens = await this.prisma.deviceToken.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: { token: true },
    });

    const registrationTokens = tokens.map((token) => token.token).filter(Boolean);

    if (!registrationTokens.length) {
      return;
    }

    await this.fcmService.sendToTokens(
      registrationTokens,
      {
        title,
        body: message,
      },
      {
        notificationType: NotificationType.PATH_GUARD_ALERT,
        incidentId,
      },
    );
  }

  private haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_METERS * c;
  }

  private distanceFromPathMeters(
    startLat: number,
    startLon: number,
    endLat: number,
    endLon: number,
    pointLat: number,
    pointLon: number,
  ): number {
    const start = this.projectToPlane(startLat, startLon, startLat);
    const end = this.projectToPlane(endLat, endLon, startLat);
    const point = this.projectToPlane(pointLat, pointLon, startLat);

    const segX = end.x - start.x;
    const segY = end.y - start.y;
    const segLengthSquared = segX * segX + segY * segY;

    if (segLengthSquared === 0) {
      const dx = point.x - start.x;
      const dy = point.y - start.y;
      return Math.sqrt(dx * dx + dy * dy);
    }

    let t = ((point.x - start.x) * segX + (point.y - start.y) * segY) / segLengthSquared;
    t = Math.max(0, Math.min(1, t));

    const projX = start.x + t * segX;
    const projY = start.y + t * segY;
    const dx = point.x - projX;
    const dy = point.y - projY;

    return Math.sqrt(dx * dx + dy * dy);
  }

  private projectToPlane(lat: number, lon: number, referenceLat: number) {
    return {
      x: EARTH_RADIUS_METERS * this.toRadians(lon) * Math.cos(this.toRadians(referenceLat)),
      y: EARTH_RADIUS_METERS * this.toRadians(lat),
    };
  }

  private toRadians(value: number): number {
    return (value * Math.PI) / 180;
  }

  private getDefaultDeviationThreshold(): number {
    return this.configService.get<number>('PATH_GUARD_DEVIATION_THRESHOLD_METERS', 50);
  }

  private getDefaultImmobilityTimeout(): number {
    return this.configService.get<number>('PATH_GUARD_IMMOBILITY_TIMEOUT_SECONDS', 300);
  }

  private getMovementThresholdMeters(): number {
    return this.configService.get<number>('PATH_GUARD_MOVEMENT_THRESHOLD_METERS', 3);
  }

  private getMovementSpeedThreshold(): number {
    return this.configService.get<number>('PATH_GUARD_MOVEMENT_SPEED_THRESHOLD_MS', 0.5);
  }
}
