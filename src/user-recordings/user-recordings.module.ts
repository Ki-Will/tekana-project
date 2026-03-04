import { Module } from '@nestjs/common';
import { UserRecordingsService } from './user-recordings.service';
import { UserRecordingsController } from './user-recordings.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { RecordingsModule } from '../recordings/recordings.module';

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({
      storage: memoryStorage(),
    }),
    RecordingsModule,
  ],
  controllers: [UserRecordingsController],
  providers: [UserRecordingsService],
  exports: [UserRecordingsService],
})
export class UserRecordingsModule {}
