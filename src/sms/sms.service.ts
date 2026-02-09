import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationChannel } from '@prisma/client';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendSms(phone: string, message: string): Promise<void> {
    const apiKey = this.configService.get<string>('SMS_GATEWAY_API_KEY');
    const url = this.configService.get<string>('SMS_GATEWAY_URL');

    if (!apiKey || !url) {
      this.logger.warn('SMS gateway not configured, skipping SMS send');
      return;
    }

    try {
      // Placeholder for actual SMS gateway integration
      // In production, use axios to call the gateway
      this.logger.log(`Sending SMS to ${phone}: ${message}`);

      // Example: await axios.post(url, { to: phone, message, apiKey });

      // For now, just log
      console.log(`SMS sent to ${phone}: ${message}`);
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${phone}`, error as Error);
    }
  }

  async sendBulkSms(phones: string[], message: string): Promise<void> {
    await Promise.all(phones.map(phone => this.sendSms(phone, message)));
  }
}
