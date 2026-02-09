import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { IncidentsModule } from './incidents/incidents.module';
import { PrismaModule } from './prisma/prisma.module';
import { MessagingModule } from './messaging/messaging.module';
import { RedisModule } from './redis/redis.module';
import { PathGuardModule } from './path-guard/path-guard.module';
import { DangerZonesModule } from './danger-zones/danger-zones.module';
import { RespondersModule } from './responders/responders.module';
import { DeviceTokensModule } from './device-tokens/device-tokens.module';
import { MediaModule } from './media/media.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    IncidentsModule,
    MessagingModule,
    RedisModule,
    PathGuardModule,
    DangerZonesModule,
    RespondersModule,
    DeviceTokensModule,
    MediaModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
