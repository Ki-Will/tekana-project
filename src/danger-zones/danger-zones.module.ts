import { Module } from '@nestjs/common';
import { DangerZonesService } from './danger-zones.service';
import { DangerZonesController } from './danger-zones.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [PrismaModule, MessagingModule],
  controllers: [DangerZonesController],
  providers: [DangerZonesService],
  exports: [DangerZonesService],
})
export class DangerZonesModule {}
