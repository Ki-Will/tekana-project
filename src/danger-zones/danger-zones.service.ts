import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDangerZoneDto } from './dto/create-danger-zone.dto';
import { DangerZoneReport, Prisma } from '@prisma/client';
import { FcmService } from '../messaging/fcm.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class DangerZonesService {
  private readonly logger = new Logger(DangerZonesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fcmService: FcmService,
    private readonly redisService: RedisService,
  ) {}

  async create(userId: string, dto: CreateDangerZoneDto): Promise<DangerZoneReport> {
    const dangerZone = await this.prisma.dangerZoneReport.create({
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

    // Invalidate cache
    await this.redisService.del('danger_zones:aggregated');

    return dangerZone;
  }

  async findAll(filter?: {
    dangerType?: string;
    severity?: string;
    userId?: string;
    skip?: number;
    take?: number;
  }): Promise<{ dangerZones: DangerZoneReport[]; total: number }> {
    const where: Prisma.DangerZoneReportWhereInput = {};

    if (filter?.dangerType) where.dangerType = filter.dangerType as any;
    if (filter?.severity) where.severity = filter.severity as any;
    if (filter?.userId) where.userId = filter.userId;

    const [dangerZones, total] = await Promise.all([
      this.prisma.dangerZoneReport.findMany({
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
      this.prisma.dangerZoneReport.count({ where }),
    ]);

    return { dangerZones, total };
  }

  async findOne(id: string): Promise<DangerZoneReport> {
    const dangerZone = await this.prisma.dangerZoneReport.findUnique({
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

  async update(id: string, updateData: Partial<CreateDangerZoneDto>): Promise<DangerZoneReport> {
    const dangerZone = await this.prisma.dangerZoneReport.update({
      where: { id },
      data: updateData,
    });

    // Invalidate cache
    await this.redisService.del('danger_zones:aggregated');

    return dangerZone;
  }

  async remove(id: string): Promise<void> {
    await this.prisma.dangerZoneReport.delete({
      where: { id },
    });

    // Invalidate cache
    await this.redisService.del('danger_zones:aggregated');
  }

  async getAggregatedZones(): Promise<any> {
    const cacheKey = 'danger_zones:aggregated';
    const cached = await this.redisService.get(cacheKey);
    if (cached) return cached;

    // Placeholder for aggregated danger zones (e.g., heatmaps)
    // Could use PostGIS or similar for spatial aggregation
    const zones = await this.prisma.dangerZoneReport.findMany({
      where: { isActive: true },
      select: {
        locationLat: true,
        locationLng: true,
        dangerType: true,
        severity: true,
        reportCount: true,
      },
    });

    await this.redisService.set(cacheKey, zones, 600); // 10 minutes TTL
    return zones;
  }
}
