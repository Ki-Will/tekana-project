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
      action: 'publish',
      streamKey: body.name,
      app: body.app,
      name: body.name,
      clientId: body.clientid,
    };
    await this.streamingService.publishStreamEvent(job);
  }

  @Post('publish_done')
  async onPublishDone(@Body() body: any): Promise<void> {
    this.logger.log(`Stream publish done: ${JSON.stringify(body)}`);
    const job: StreamEventJob = {
      action: 'publish_done',
      streamKey: body.name,
      app: body.app,
      name: body.name,
      clientId: body.clientid,
    };
    await this.streamingService.publishStreamEvent(job);
  }

  @Post('play')
  async onPlay(@Body() body: any): Promise<void> {
    this.logger.log(`Stream play: ${JSON.stringify(body)}`);
    const job: StreamEventJob = {
      action: 'play',
      streamKey: body.name,
      app: body.app,
      name: body.name,
      clientId: body.clientid,
    };
    await this.streamingService.publishStreamEvent(job);
  }

  @Post('play_done')
  async onPlayDone(@Body() body: any): Promise<void> {
    this.logger.log(`Stream play done: ${JSON.stringify(body)}`);
    const job: StreamEventJob = {
      action: 'play_done',
      streamKey: body.name,
      app: body.app,
      name: body.name,
      clientId: body.clientid,
    };
    await this.streamingService.publishStreamEvent(job);
  }
}
