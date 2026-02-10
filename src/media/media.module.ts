import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MediaConsumerService } from './media.consumer';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [PrismaModule, MessagingModule],
  controllers: [MediaController],
  providers: [MediaService, MediaConsumerService],
  exports: [MediaService],
})
export class MediaModule {}
