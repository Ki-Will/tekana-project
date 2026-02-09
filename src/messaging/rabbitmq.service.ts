import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import type { ChannelModel, ConfirmChannel } from 'amqplib';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: ChannelModel | null = null;
  private channel: ConfirmChannel | null = null;
  private readonly exchangeName: string;
  private readonly exchangeType: string;

  constructor(private readonly configService: ConfigService) {
    this.exchangeName = this.configService.get<string>('RABBITMQ_EXCHANGE', 'tekana.events');
    this.exchangeType = this.configService.get<string>('RABBITMQ_EXCHANGE_TYPE', 'topic');
  }

  async onModuleInit() {
    await this.ensureConnection();
  }

  async onModuleDestroy() {
    if (this.channel) {
      await this.channel.close().catch((error) => this.logger.error('Error closing channel', error));
      this.channel = null;
    }

    if (this.connection) {
      await this.connection.close().catch((error) => this.logger.error('Error closing connection', error));
      this.connection = null;
    }
  }

  async publish(routingKey: string, payload: unknown): Promise<void> {
    const channel = await this.ensureChannel();

    const messageBuffer = Buffer.from(JSON.stringify({
      timestamp: new Date().toISOString(),
      payload,
    }));

    try {
      channel.publish(this.exchangeName, routingKey, messageBuffer, {
        contentType: 'application/json',
        persistent: true,
      });
      await channel.waitForConfirms();
      this.logger.log(`Published message to ${this.exchangeName}:${routingKey}`);
    } catch (error) {
      this.logger.error('Failed to publish message', error as Error);
      throw error;
    }
  }

  private async ensureConnection(): Promise<ChannelModel> {
    if (this.connection) {
      return this.connection;
    }

    const url = this.configService.get<string>('RABBITMQ_URL');

    if (!url) {
      throw new Error('RABBITMQ_URL is not configured');
    }

    try {
      const connection = await amqp.connect(url);
      connection.on('error', (error) => {
        this.logger.error('RabbitMQ connection error', error);
        this.connection = null;
      });
      connection.on('close', () => {
        this.logger.warn('RabbitMQ connection closed');
        this.connection = null;
      });
      this.logger.log('Connected to RabbitMQ');
      this.connection = connection;
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ', error as Error);
      throw error;
    }

    return this.connection;
  }

  private async ensureChannel(): Promise<ConfirmChannel> {
    if (this.channel) {
      return this.channel;
    }

    const connection = await this.ensureConnection();

    try {
      const channel = await connection.createConfirmChannel();
      await channel.assertExchange(this.exchangeName, this.exchangeType, {
        durable: true,
      });
      channel.on('error', (error) => {
        this.logger.error('RabbitMQ channel error', error);
        this.channel = null;
      });
      channel.on('close', () => {
        this.logger.warn('RabbitMQ channel closed');
        this.channel = null;
      });
      this.channel = channel;
      this.logger.log(`RabbitMQ channel established for exchange ${this.exchangeName}`);
    } catch (error) {
      this.logger.error('Failed to create RabbitMQ channel', error as Error);
      throw error;
    }

    return this.channel;
  }
}
