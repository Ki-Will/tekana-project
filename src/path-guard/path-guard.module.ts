import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PathGuardService } from './path-guard.service.js';
import { PathGuardController } from './path-guard.controller.js';
import { PrismaModule } from '../prisma/prisma.module';
import { IncidentsModule } from '../incidents/incidents.module';
import { MessagingModule } from '../messaging/messaging.module';
import { MapsModule } from '../maps/maps.module';
import { IncidentsService } from '../incidents/incidents.service';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';

@Module({
  imports: [ConfigModule, PrismaModule, IncidentsModule, MessagingModule, MapsModule],
  controllers: [PathGuardController],
  providers: [PathGuardService, IncidentsService, AuditService, EmailService],
  exports: [PathGuardService],
})
export class PathGuardModule {}
