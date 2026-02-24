import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id || request.ip; // Use user ID if authenticated, else IP
    const key = `rate_limit:${userId}`;
    const limit = 5; // 5 requests per minute
    const ttl = 60; // 1 minute

    const currentStr = String((await this.redisService.get(key)) || '0');
    const current = parseInt(currentStr, 10);
    if (current >= limit) {
      throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
    }

    const newCount = current + 1;
    await this.redisService.set(key, newCount.toString(), ttl);
    return true;
  }
}
