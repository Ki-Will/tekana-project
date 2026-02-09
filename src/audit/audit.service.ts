import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLog } from '@prisma/client';

export interface AuditLogData {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logAction(data: AuditLogData): Promise<AuditLog> {
    const log = await this.prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        oldValues: data.oldValues ? JSON.parse(JSON.stringify(data.oldValues)) : undefined,
        newValues: data.newValues ? JSON.parse(JSON.stringify(data.newValues)) : undefined,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });

    this.logger.log(`Audit log created: ${data.action} on ${data.resource}`);
    return log;
  }

  async getLogs(filter?: {
    userId?: string;
    action?: string;
    resource?: string;
    skip?: number;
    take?: number;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    const where: any = {};

    if (filter?.userId) where.userId = filter.userId;
    if (filter?.action) where.action = filter.action;
    if (filter?.resource) where.resource = filter.resource;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: filter?.skip,
        take: filter?.take,
        orderBy: { timestamp: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }
}
