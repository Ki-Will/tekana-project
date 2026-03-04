import { Module } from '@nestjs/common';
import { RecordingsGateway } from './recordings.gateway';

@Module({
  providers: [RecordingsGateway],
  exports: [RecordingsGateway],
})
export class RecordingsModule {}
