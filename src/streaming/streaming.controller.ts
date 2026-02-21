import { Controller, Post, Body, Logger } from '@nestjs/common';
import { StreamingService, StreamEventJob } from './streaming.service';

@Controller('streaming')
export class StreamingController {
  private readonly logger = new Logger(StreamingController.name);

  constructor(private readonly streamingService: StreamingService) {}

  @Post('publish')
  async onPublish(@Body() body: any): Promise<void> {
    this.logger.log(`Stream publish: ${JSON.stringify(body)}`);
    const job: StreamEventJob = {
      streamKey: body.name,
      event: 'publish',
    };
    await this.streamingService.publishStreamEvent(job);
  }

  @Post('publish_done')
  async onPublishDone(@Body() body: any): Promise<void> {
    this.logger.log(`Stream publish done: ${JSON.stringify(body)}`);
    const job: StreamEventJob = {
      streamKey: body.name,
      event: 'publish_done',
    };
    await this.streamingService.publishStreamEvent(job);
  }

  @Post('play')
  async onPlay(@Body() body: any): Promise<void> {
    this.logger.log(`Stream play: ${JSON.stringify(body)}`);
    const job: StreamEventJob = {
      streamKey: body.name,
      event: 'play',
    };
    await this.streamingService.publishStreamEvent(job);
  }

  @Post('play_done')
  async onPlayDone(@Body() body: any): Promise<void> {
    this.logger.log(`Stream play done: ${JSON.stringify(body)}`);
    const job: StreamEventJob = {
      streamKey: body.name,
      event: 'play_done',
    };
    await this.streamingService.publishStreamEvent(job);
  }
}
