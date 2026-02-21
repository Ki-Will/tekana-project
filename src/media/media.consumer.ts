import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadMediaDto } from './dto/upload-media.dto';
import { S3Client, PutObjectCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import * as amqp from 'amqplib';
import { Readable } from 'stream';
import { MediaType } from '@prisma/client';

interface MediaUploadJob {
  jobId: string;
  incidentId: string;
  fileBufferBase64: string;
  fileSize: number;
  type: MediaType;
  fileName: string;
  duration?: string;
}

@Injectable()
export class MediaConsumerService implements OnModuleInit {
  private readonly logger = new Logger(MediaConsumerService.name);
  private s3: S3Client;

  constructor(private readonly prisma: PrismaService) {
    this.s3 = new S3Client({
      region: process.env.AWS_REGION,
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  async onModuleInit() {
    this.startConsumer();
  }

  private async startConsumer() {
    try {
      const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672');
      const channel = await connection.createChannel();
      const exchange = 'tekana.events';
      const queue = 'media.upload';

      await channel.assertExchange(exchange, 'topic', { durable: true });
      await channel.assertQueue(queue, { durable: true });
      await channel.bindQueue(queue, exchange, 'media.upload');
      await channel.prefetch(1); // Process one job at a time

      this.logger.log('Media upload consumer started');

      channel.consume(queue, async (msg) => {
        if (msg) {
          try {
            const data = JSON.parse(msg.content.toString());
            const job: MediaUploadJob = data.payload;
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
    const { jobId, incidentId, fileBufferBase64, fileSize, type, fileName, duration } = job;

    this.logger.log(`Processing media upload job: ${jobId}`);

    const bucketName = process.env.S3_BUCKET_NAME!;
    try {
      await this.s3.send(new CreateBucketCommand({ Bucket: bucketName }));
    } catch (error) {
      this.logger.log(`Bucket ${bucketName} already exists or error: ${(error as Error).message}`);
    }

    const fileBuffer = Buffer.from(fileBufferBase64, 'base64');

    // Generate unique key for S3
    const fileKey = `incidents/${incidentId}/${Date.now()}-${fileName || 'media'}`;

    // Upload to S3
    const uploadParams = {
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: fileKey,
      Body: Readable.from(fileBuffer),
      ContentLength: fileBuffer.length,
      ContentType: this.getContentType(type),
    };

    const command = new PutObjectCommand(uploadParams);
    const result = await this.s3.send(command);
    const fileUrl = `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET_NAME}/${fileKey}`;

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
