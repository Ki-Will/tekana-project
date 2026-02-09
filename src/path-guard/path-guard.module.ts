import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PathGuardService } from './path-guard.service.js';
import { PathGuardController } from './path-guard.controller.js';
import { PrismaModule } from '../prisma/prisma.module';
import { IncidentsModule } from '../incidents/incidents.module';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [ConfigModule, PrismaModule, IncidentsModule, MessagingModule],
  controllers: [PathGuardController],
  providers: [PathGuardService],
  exports: [PathGuardService],
})
export class PathGuardModule {}
