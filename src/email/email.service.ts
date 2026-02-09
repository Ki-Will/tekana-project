import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '../messaging/rabbitmq.service';

interface EmailJob {
  to: string;
  subject: string;
  body: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly rabbitMQService: RabbitMQService) {}

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    this.logger.log(`Publishing email job to ${to}: ${subject}`);

    const job: EmailJob = { to, subject, body };
    await this.rabbitMQService.publish('email.send', job);

    this.logger.log(`Email job published for ${to}`);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] Email job sent to queue for ${to}`);
    }
  }
}
