import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailConsumerService } from './email.consumer';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [MessagingModule],
  providers: [EmailService, EmailConsumerService],
  exports: [EmailService],
})
export class EmailModule {}
