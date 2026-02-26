import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateResponderProfileDto } from './dto/update-responder-profile.dto';
import { ResponderProfile, ResponderAction, Prisma, IncidentStatus } from '@prisma/client';

@Injectable()
export class RespondersService {
  private readonly logger = new Logger(RespondersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<ResponderProfile> {
    const profile = await this.prisma.responderProfile.findUnique({
      where: { userId },
      include: { user: { select: { id: true, name: true, phone: true } } },
    });

    if (!profile) {
      throw new NotFoundException('Responder profile not found');
    }

    return profile;
  }

  async updateProfile(userId: string, dto: UpdateResponderProfileDto): Promise<ResponderProfile> {
    const profile = await this.prisma.responderProfile.update({
      where: { userId },
      data: {
        isAvailable: dto.isAvailable,
        currentLocationLat: dto.currentLocationLat,
        currentLocationLng: dto.currentLocationLng,
        responseRadius: dto.responseRadius,
        skills: dto.skills,
        certifications: dto.certifications,
        verificationDocument: dto.verificationDocument,
        lastLocationUpdate: dto.currentLocationLat ? new Date() : undefined,
      },
    });

    return profile;
  }

  async verifyProfile(userId: string): Promise<ResponderProfile> {
    const profile = await this.prisma.responderProfile.update({
      where: { userId },
      data: { isVerified: true },
    });

    return profile;
  }

  async getActions(userId: string, filter?: { incidentId?: string; status?: string }): Promise<ResponderAction[]> {
    const where: Prisma.ResponderActionWhereInput = {
      responderId: (await this.getProfile(userId)).id,
    };

    if (filter?.incidentId) where.incidentId = filter.incidentId;
    if (filter?.status) where.status = filter.status as any;

    return this.prisma.responderAction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        incident: {
          select: { id: true, type: true, status: true, locationLat: true, locationLng: true },
        },
      },
    });
  }

  async completeAction(userId: string, actionId: string, notes?: string): Promise<ResponderAction> {
    const profile = await this.getProfile(userId);
    const action = await this.prisma.responderAction.findUnique({ where: { id: actionId } });

    if (!action || action.responderId !== profile.id) {
      throw new NotFoundException('Action not found');
    }

    return this.prisma.responderAction.update({
      where: { id: actionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        notes,
      },
    });
  }

  async getNearbyIncidents(userId: string): Promise<any[]> {
    const profile = await this.getProfile(userId);
    if (!profile.currentLocationLat || !profile.currentLocationLng) {
      return [];
    }

    const radius = profile.responseRadius ?? 5000; // 5km default

    // Note: This is a simplified distance check. In production, use PostGIS or similar.
    const incidents = await this.prisma.incident.findMany({
      where: {
        status: { in: ['ACTIVE', 'RESPONDERS_DISPATCHED', 'IN_PROGRESS'] },
      },
      select: {
        id: true,
        type: true,
        severity: true,
        locationLat: true,
        locationLng: true,
        createdAt: true,
      },
    });

    // Filter by distance (rough approximation)
    const nearby = incidents.filter(incident => {
      const distance = this.haversineDistance(
        profile.currentLocationLat!,
        profile.currentLocationLng!,
        incident.locationLat,
        incident.locationLng,
      );
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

  async resolveIncident(userId: string, incidentId: string, notes?: string) {
    const profile = await this.getProfile(userId);

    const action = await this.prisma.responderAction.findFirst({
      where: {
        responderId: profile.id,
        incidentId,
        status: { in: ['PENDING', 'IN_PROGRESS'] }
      }
    });

    if (!action) {
      throw new NotFoundException('No active action found for this incident');
    }

    // Update incident to resolved
    await this.prisma.incident.update({
      where: { id: incidentId },
      data: {
        status: IncidentStatus.RESOLVED,
        resolvedAt: new Date(),
      }
    });

    // Complete the responder's action
    await this.prisma.responderAction.update({
      where: { id: action.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        notes,
      }
    });

    this.logger.log(`Responder ${userId} resolved incident ${incidentId}`);

    return { message: 'Incident resolved successfully' };
  }
}
