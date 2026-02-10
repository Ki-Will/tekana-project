import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadMediaDto } from './dto/upload-media.dto';
import * as AWS from 'aws-sdk';
import * as amqp from 'amqplib';

interface MediaUploadJob {
  jobId: string;
  incidentId: string;
  dto: UploadMediaDto;
}

@Injectable()
export class MediaConsumerService implements OnModuleInit {
  private readonly logger = new Logger(MediaConsumerService.name);
  private s3: AWS.S3;

  constructor(private readonly prisma: PrismaService) {
    // Configure AWS SDK
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
    });
    this.s3 = new AWS.S3();
  }

  async onModuleInit() {
    this.startConsumer();
  }

  private async startConsumer() {
    try {
      const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672');
      const channel = await connection.createChannel();
      const queue = 'media.upload';

      await channel.assertQueue(queue, { durable: true });
      await channel.prefetch(1); // Process one job at a time

      this.logger.log('Media upload consumer started');

      channel.consume(queue, async (msg) => {
        if (msg) {
          try {
            const job: MediaUploadJob = JSON.parse(msg.content.toString());
            await this.processUploadJob(job);
            channel.ack(msg);
          } catch (error) {
            this.logger.error('Failed to process media upload job', error as Error);
            channel.nack(msg, false, false); // Don't requeue
          }
        }
      });
    } catch (error) {
      this.logger.error('Failed to start media upload consumer', error as Error);
    }
  }

  private async processUploadJob(job: MediaUploadJob) {
    const { jobId, incidentId, dto } = job;

    this.logger.log(`Processing media upload job: ${jobId}`);

    if (!dto.fileData) {
      throw new Error('File data is required');
    }

    // Convert base64 to buffer
    const fileBuffer = Buffer.from(dto.fileData, 'base64');
    const fileSize = fileBuffer.length;

    // Generate unique key for S3
    const fileKey = `incidents/${incidentId}/${Date.now()}-${dto.fileName || 'media'}`;

    // Upload to S3
    const uploadParams = {
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: fileKey,
      Body: fileBuffer,
      ContentType: this.getContentType(dto.type),
    };

    const result = await this.s3.upload(uploadParams).promise();
    const fileUrl = result.Location;

    this.logger.log(`Media uploaded to S3: ${fileUrl}`);

    // Update the MediaFile with the S3 URL
    await this.prisma.mediaFile.updateMany({
      where: { filePath: `job:${jobId}` },
      data: {
        filePath: fileUrl,
        fileSize,
      },
    });

    this.logger.log(`Media file updated for job: ${jobId}`);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] Media uploaded and updated for incident ${incidentId}`);
    }
  }

  private getContentType(type: string): string {
    switch (type) {
      case 'IMAGE':
        return 'image/jpeg';
      case 'VIDEO':
        return 'video/mp4';
      case 'AUDIO':
        return 'audio/mpeg';
      default:
        return 'application/octet-stream';
    }
  }
}
