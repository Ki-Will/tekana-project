import {
  Controller,
  Post,
  Body,
  Logger,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StreamingService, StreamEventJob } from './streaming.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@ApiTags('Streaming')
@Controller('streaming')
export class StreamingController {
  private readonly logger = new Logger(StreamingController.name);

  constructor(
    private readonly streamingService: StreamingService,
    private readonly prisma: PrismaService,
  ) {}
  @Post('publish')
  @ApiOperation({ summary: 'Handle RTMP publish event with authentication' })
  @ApiResponse({ status: 201, description: 'Publish event handled' })
  @ApiResponse({ status: 403, description: 'Authentication failed' })
  async onPublish(@Body() body: any, @Query() query: any): Promise<void> {
    const username = query.arg_user;
    const password = query.arg_pass;

    if (username && password) {
      const user = await this.prisma.user.findUnique({
        where: { phone: username },
      });

      if (
        !user ||
        !user.password ||
        !(await bcrypt.compare(password, user.password))
      ) {
        this.logger.warn(`Authentication failed for stream ${body.name}`);
        throw new ForbiddenException(); // IMPORTANT
      }

      this.logger.log(`Authenticated ${username} for stream ${body.name}`);
    } else {
      this.logger.warn(`No credentials provided for ${body.name}`);
      throw new ForbiddenException();
    }

    await this.streamingService.publishStreamEvent({
      streamKey: body.name,
      event: 'publish',
    });

  }

  
  @Post('publish_done')
  @ApiOperation({ summary: 'Handle RTMP publish done event' })
  @ApiResponse({ status: 201, description: 'Publish done event handled' })
  async onPublishDone(@Body() body: any): Promise<void> {
    this.logger.log(`Stream publish done: ${JSON.stringify(body)}`);
    const job: StreamEventJob = {
      streamKey: body.name,
      event: 'publish_done',
    };
    await this.streamingService.publishStreamEvent(job);
  }

  @Post('play')
  @ApiOperation({ summary: 'Handle RTMP play event' })
  @ApiResponse({ status: 201, description: 'Play event handled' })
  async onPlay(@Body() body: any): Promise<void> {
    this.logger.log(`Stream play: ${JSON.stringify(body)}`);
    const job: StreamEventJob = {
      streamKey: body.name,
      event: 'play',
    };
    await this.streamingService.publishStreamEvent(job);
  }

  @Post('play_done')
  @ApiOperation({ summary: 'Handle RTMP play done event' })
  @ApiResponse({ status: 201, description: 'Play done event handled' })
  async onPlayDone(@Body() body: any): Promise<void> {
    this.logger.log(`Stream play done: ${JSON.stringify(body)}`);
    const job: StreamEventJob = {
      streamKey: body.name,
      event: 'play_done',
    };
    await this.streamingService.publishStreamEvent(job);
  }
}
