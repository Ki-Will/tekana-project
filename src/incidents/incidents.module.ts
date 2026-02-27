import { Module } from '@nestjs/common';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MessagingModule } from '../messaging/messaging.module';
import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../email/email.module';
import { MapsModule } from '../maps/maps.module';

@Module({
  imports: [PrismaModule, MessagingModule, AuditModule, EmailModule, MapsModule],
  controllers: [IncidentsController],
  providers: [IncidentsService],
  exports: [IncidentsService],
})
export class IncidentsModule {}
