import { Module } from '@nestjs/common';
import { StreamingService } from './streaming.service';
import { StreamingController } from './streaming.controller';
import { StreamingConsumerService } from './streaming.consumer';
import { MessagingModule } from '../messaging/messaging.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [MessagingModule, ConfigModule],
  controllers: [StreamingController],
  providers: [StreamingService, StreamingConsumerService],
  exports: [StreamingService],
})
export class StreamingModule {}
