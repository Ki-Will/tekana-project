import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitMQService } from './rabbitmq.service';
import { FcmService } from './fcm.service';
import { SmsModule } from '../sms/sms.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [ConfigModule, SmsModule, EmailModule],
  providers: [RabbitMQService, FcmService],
  exports: [RabbitMQService, FcmService, EmailModule],
})
export class MessagingModule {}
