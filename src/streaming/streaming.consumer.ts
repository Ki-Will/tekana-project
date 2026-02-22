import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '../messaging/rabbitmq.service';
import { StreamEventJob } from './streaming.service';
import { S3Client, PutObjectCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as amqp from 'amqplib';
import { Readable } from 'stream';

@Injectable()
export class StreamingConsumerService implements OnModuleInit {
  private readonly logger = new Logger(StreamingConsumerService.name);
  private s3Client: S3Client;

  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly configService: ConfigService,
  ) {
    this.s3Client = new S3Client({
      endpoint: this.configService.get<string>('S3_ENDPOINT')!,
      region: this.configService.get<string>('AWS_REGION')!,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID')!,
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY')!,
      },
      forcePathStyle: true,
    });
  }

  async onModuleInit(): Promise<void> {
    const bucketName = this.configService.get<string>('S3_BUCKET_NAME') || 'tekana-media';
    try {
      await this.s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
      this.logger.log(`Bucket ${bucketName} created or already exists`);
    } catch (error: any) {
      this.logger.warn(`Bucket creation failed: ${error.message}`);
    }
    this.startConsumer();
  }

  private async startConsumer() {
    try {
      const connection = await amqp.connect(this.configService.get<string>('RABBITMQ_URL') || 'amqp://guest:guest@localhost:5672');
      const channel = await connection.createChannel();
      const exchange = 'tekana.events';
      const queue = 'streaming_events';

      await channel.assertExchange(exchange, 'topic', { durable: true });
      await channel.assertQueue(queue, { durable: true });
      await channel.bindQueue(queue, exchange, 'streaming.events');
      await channel.prefetch(1); // Process one job at a time

      this.logger.log('Streaming events consumer started');

      channel.consume(queue, async (msg) => {
        if (msg) {
          console.log('Received streaming event message');
          try {
            const message = JSON.parse(msg.content.toString());
            const job: StreamEventJob = message.payload;
            await this.handleStreamEvent(job);
            channel.ack(msg);
          } catch (error) {
            this.logger.error('Error processing streaming event', error);
            channel.nack(msg, false, false);
          }
        }
      });
    } catch (error) {
      this.logger.error('Failed to start streaming consumer', error);
    }
  }

  private async handleStreamEvent(job: StreamEventJob): Promise<void> {
    this.logger.log(`Handling stream event: ${job.event} for ${job.streamKey}`);

    if (job.event === 'publish_done') {
      await this.uploadRecordedFile(job.streamKey);
    }

    // Handle other actions if needed
  }

  private async uploadRecordedFile(streamKey: string): Promise<void> {
    const recordingsDir = './recordings';
    console.log(`Recordings dir: ${recordingsDir}, exists: ${fs.existsSync(recordingsDir)}`);
    const files = fs.readdirSync(recordingsDir).filter(file => file.startsWith(streamKey));
    console.log(`Files in recordings for ${streamKey}: ${files.join(', ')}`);

    if (files.length === 0) {
      console.log(`No recorded file found for stream ${streamKey}`);
      return;
    }

    // Assuming the latest file is the one to upload
    const latestFile = files.sort().pop()!;
    const filePath = path.join(recordingsDir, latestFile);
    const fileContent = fs.readFileSync(filePath);
    console.log(`Uploading file ${latestFile} for stream ${streamKey}`);

    const bucketName = this.configService.get<string>('S3_BUCKET_NAME') || 'tekana-media';
    const key = `streams/${latestFile}`;

    try {
      await this.s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: Readable.from(fileContent),
        ContentLength: fileContent.length,
        ContentType: 'video/x-flv',
      }));
      this.logger.log(`Uploaded recorded file ${latestFile} to MinIO`);
      console.log(`Uploaded and deleted ${latestFile} for stream ${streamKey}`);
      // Optionally, delete the local file after upload
      fs.unlinkSync(filePath);
    } catch (error: any) {
      this.logger.error(`Failed to upload recorded file ${latestFile}`, error.message);
    }
  }
}
