import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDangerZoneDto } from './dto/create-danger-zone.dto';
import { DangerZone, Prisma } from '@prisma/client';
import { FcmService } from '../messaging/fcm.service';

@Injectable()
export class DangerZonesService {
  private readonly logger = new Logger(DangerZonesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fcmService: FcmService,
  ) {}

  async create(userId: string, dto: CreateDangerZoneDto): Promise<DangerZone> {
    const dangerZone = await this.prisma.dangerZone.create({
      data: {
        userId,
        locationLat: dto.locationLat,
        locationLng: dto.locationLng,
        locationAddress: dto.locationAddress,
        dangerType: dto.dangerType,
        description: dto.description,
        severity: dto.severity ?? 'MEDIUM',
      },
    });

    // Optional: Notify nearby users or authorities about new danger zone
    this.logger.log(`Danger zone reported by user ${userId} at (${dto.locationLat}, ${dto.locationLng})`);

    return dangerZone;
  }

  async findAll(filter?: {
    dangerType?: string;
    severity?: string;
    userId?: string;
    skip?: number;
    take?: number;
  }): Promise<{ dangerZones: DangerZone[]; total: number }> {
    const where: Prisma.DangerZoneWhereInput = {};

    if (filter?.dangerType) where.dangerType = filter.dangerType as any;
    if (filter?.severity) where.severity = filter.severity as any;
    if (filter?.userId) where.userId = filter.userId;

    const [dangerZones, total] = await Promise.all([
      this.prisma.dangerZone.findMany({
        where,
        skip: filter?.skip,
        take: filter?.take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.dangerZone.count({ where }),
    ]);

    return { dangerZones, total };
  }

  async findOne(id: string): Promise<DangerZone> {
    const dangerZone = await this.prisma.dangerZone.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    if (!dangerZone) {
      throw new Error('Danger zone not found');
    }

    return dangerZone;
  }

  async update(id: string, updateData: Partial<CreateDangerZoneDto>): Promise<DangerZone> {
    const dangerZone = await this.prisma.dangerZone.update({
      where: { id },
      data: updateData,
    });

    return dangerZone;
  }

  async remove(id: string): Promise<void> {
    await this.prisma.dangerZone.delete({
      where: { id },
    });
  }

  async getAggregatedZones(): Promise<any> {
    // Placeholder for aggregated danger zones (e.g., heatmaps)
    // Could use PostGIS or similar for spatial aggregation
    const zones = await this.prisma.dangerZone.findMany({
      where: { isActive: true },
      select: {
        locationLat: true,
        locationLng: true,
        dangerType: true,
        severity: true,
        reportCount: true,
      },
    });

    return zones;
  }
}
