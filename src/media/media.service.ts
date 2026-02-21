import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RabbitMQService } from '../messaging/rabbitmq.service';
import { UploadMediaDto } from './dto/upload-media.dto';
import { MediaFile, MediaType } from '@prisma/client';
import { S3Client } from '@aws-sdk/client-s3';

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
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private s3: S3Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitMQService: RabbitMQService,
  ) {
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

  async uploadMedia(incidentId: string, dto: UploadMediaDto, file: any): Promise<MediaFile> {
    if (!file || !file.buffer) {
      throw new BadRequestException('File is required');
    }

    this.logger.log(`Publishing media upload job for incident ${incidentId}: ${dto.type}`);

    // Generate unique job ID
    const jobId = `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create placeholder MediaFile
    const media = await this.prisma.mediaFile.create({
      data: {
        incidentId,
        type: dto.type,
        filePath: `job:${jobId}`, // Placeholder, will be updated by consumer
        fileName: dto.fileName || file.originalname,
        fileSize: file.size,
        duration: dto.duration ? parseInt(dto.duration) : undefined,
        isEncrypted: false,
        encryptionKey: null,
      },
    });

    // Publish job to RabbitMQ
    const job: MediaUploadJob = {
      jobId,
      incidentId,
      fileBufferBase64: file.buffer.toString('base64'),
      fileSize: file.size,
      type: dto.type,
      fileName: dto.fileName || file.originalname,
      duration: dto.duration,
    };
    await this.rabbitMQService.publish('media.upload', job);

    this.logger.log(`Media upload job published: ${jobId}`);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] Media upload job sent to queue for incident ${incidentId}`);
    }

    return media;
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

  async getMedia(id: string): Promise<MediaFile> {
    const media = await this.prisma.mediaFile.findUnique({
      where: { id },
    });

    if (!media) {
      throw new Error('Media file not found');
    }

    return media;
  }

  async getMediaForIncident(incidentId: string): Promise<MediaFile[]> {
    return this.prisma.mediaFile.findMany({
      where: { incidentId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
