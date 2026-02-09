import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as amqp from 'amqplib';

interface EmailJob {
  to: string;
  subject: string;
  body: string;
}

@Injectable()
export class EmailConsumerService implements OnModuleInit {
  private readonly logger = new Logger(EmailConsumerService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    // Create nodemailer transporter
    this.transporter = nodemailer.createTransporter({
      host: process.env.EMAIL_SMTP_HOST,
      port: parseInt(process.env.EMAIL_SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_SMTP_USER,
        pass: process.env.EMAIL_SMTP_PASS,
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
      const queue = 'email.send';

      await channel.assertQueue(queue, { durable: true });
      await channel.prefetch(1); // Process one email at a time

      this.logger.log('Email consumer started');

      channel.consume(queue, async (msg) => {
        if (msg) {
          try {
            const job: EmailJob = JSON.parse(msg.content.toString());
            await this.processEmailJob(job);
            channel.ack(msg);
          } catch (error) {
            this.logger.error('Failed to process email job', error as Error);
            channel.nack(msg, false, false); // Don't requeue
          }
        }
      });
    } catch (error) {
      this.logger.error('Failed to start email consumer', error as Error);
    }
  }

  private async processEmailJob(job: EmailJob) {
    const { to, subject, body } = job;

    this.logger.log(`Sending email to ${to}: ${subject}`);

    try {
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@example.com',
        to,
        subject,
        text: body, // or html if needed
      });

      this.logger.log(`Email sent: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error as Error);
      throw error;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] Email sent to ${to}`);
    }
  }
}
