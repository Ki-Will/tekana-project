import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { Redis as RedisClient } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClient | null = null;
  private readonly defaultTtl: number;

  constructor(private readonly configService: ConfigService) {
    this.defaultTtl = Number(this.configService.get<number>('REDIS_DEFAULT_TTL', 60));
  }

  async onModuleInit() {
    await this.ensureClient();
  }

  async onModuleDestroy() {
    await this.client?.quit().catch((error) => this.logger.error('Error closing Redis connection', error));
    this.client = null;
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const client = await this.ensureClient();
    const value = await client.get(key);
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Failed to parse Redis value for key ${key}`, error as Error);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const client = await this.ensureClient();
    const payload = JSON.stringify(value);
    const ttl = ttlSeconds ?? this.defaultTtl;

    if (ttl > 0) {
      await client.set(key, payload, 'EX', ttl);
    } else {
      await client.set(key, payload);
    }
  }

  async del(key: string): Promise<void> {
    const client = await this.ensureClient();
    await client.del(key);
  }

  async flushByPattern(pattern: string): Promise<void> {
    const client = await this.ensureClient();
    const stream = client.scanStream({ match: pattern });

    const keys: string[] = [];

    for await (const resultKeys of stream) {
      for (const key of resultKeys) {
        keys.push(key);
        if (keys.length >= 100) {
          await client.del(...keys);
          keys.length = 0;
        }
      }
    }

    if (keys.length > 0) {
      await client.del(...keys);
    }
  }

  getClient(): RedisClient {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    return this.client;
  }

  private async ensureClient(): Promise<RedisClient> {
    if (this.client) {
      return this.client;
    }

    const url = this.configService.get<string>('REDIS_URL');

    if (!url) {
      throw new Error('REDIS_URL is not configured');
    }

    try {
      this.client = new Redis(url, {
        lazyConnect: false,
        maxRetriesPerRequest: Number(this.configService.get<number>('REDIS_MAX_RETRIES', 3)),
        reconnectOnError: () => true,
      });

      this.client.on('error', (error) => this.logger.error('Redis error', error));
      this.client.on('connect', () => this.logger.log('Connected to Redis'));
      this.client.on('close', () => this.logger.warn('Redis connection closed'));
    } catch (error) {
      this.logger.error('Failed to initialize Redis client', error as Error);
      throw error;
    }

    return this.client;
  }
}
