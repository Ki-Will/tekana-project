import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '../messaging/rabbitmq.service';

export interface StreamEventJob {
  event: 'publish' | 'publish_done' | 'play' | 'play_done';
  streamKey: string;
  app?: string;
  name?: string;
  clientId?: string;
}

@Injectable()
export class StreamingService {
  private readonly logger = new Logger(StreamingService.name);

  constructor(private readonly rabbitMQService: RabbitMQService) {}

  async publishStreamEvent(job: StreamEventJob): Promise<void> {
    this.logger.log(`Publishing stream event: ${job.name} for stream ${job.streamKey}`);
    await this.rabbitMQService.publish('streaming_events', job);
  }
}
