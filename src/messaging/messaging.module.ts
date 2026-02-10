import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitMQService } from './rabbitmq.service';
import { FcmService } from './fcm.service';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [ConfigModule, SmsModule],
  providers: [RabbitMQService, FcmService],
  exports: [RabbitMQService, FcmService],
})
export class MessagingModule {}
