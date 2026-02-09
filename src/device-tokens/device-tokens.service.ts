import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeviceTokenDto } from './dto/create-device-token.dto';
import { DeviceToken, DeviceType } from '@prisma/client';

@Injectable()
export class DeviceTokensService {
  private readonly logger = new Logger(DeviceTokensService.name);

  constructor(private readonly prisma: PrismaService) {}

  async registerToken(userId: string, dto: CreateDeviceTokenDto): Promise<DeviceToken> {
    // Upsert token for user
    const token = await this.prisma.deviceToken.upsert({
      where: {
        userId_token: {
          userId,
          token: dto.token,
        },
      },
      update: {
        deviceType: dto.deviceType,
        isActive: true,
        lastUsedAt: new Date(),
      },
      create: {
        userId,
        token: dto.token,
        deviceType: dto.deviceType,
        isActive: true,
        lastUsedAt: new Date(),
      },
    });

    this.logger.log(`Device token registered for user ${userId}`);
    return token;
  }

  async removeToken(userId: string, token: string): Promise<void> {
    await this.prisma.deviceToken.updateMany({
      where: {
        userId,
        token,
      },
      data: {
        isActive: false,
      },
    });

    this.logger.log(`Device token deactivated for user ${userId}`);
  }

  async getActiveTokens(userId: string): Promise<DeviceToken[]> {
    return this.prisma.deviceToken.findMany({
      where: {
        userId,
        isActive: true,
      },
    });
  }

  async cleanInactiveTokens(): Promise<void> {
    // Mark tokens as inactive if not used for 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await this.prisma.deviceToken.updateMany({
      where: {
        lastUsedAt: {
          lt: thirtyDaysAgo,
        },
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    this.logger.log('Cleaned up inactive device tokens');
  }
}
