import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { existsSync, readFileSync } from 'fs';

export interface PushNotificationOptions {
  title: string;
  body: string;
}

@Injectable()
export class FcmService {
  private readonly logger = new Logger(FcmService.name);
  private isInitialized = false;

  constructor(private readonly configService: ConfigService) {
    this.initializeFirebase();
  }

  private initializeFirebase(): void {
    if (admin.apps.length > 0) {
      this.isInitialized = true;
      return;
    }

    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
    let privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');
    const serviceAccountPath = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH');

    try {
      if (projectId && clientEmail && privateKey) {
        if (privateKey.includes('\\n')) {
          privateKey = privateKey.replace(/\\n/g, '\n');
        }

        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
        this.isInitialized = true;
        this.logger.log('Initialized Firebase Admin SDK using environment variables.');
        return;
      }

      if (serviceAccountPath) {
        if (!existsSync(serviceAccountPath)) {
          throw new Error(`Service account file not found at path: ${serviceAccountPath}`);
        }

        const serviceAccountRaw = readFileSync(serviceAccountPath, 'utf-8');
        const serviceAccount = JSON.parse(serviceAccountRaw);

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        this.isInitialized = true;
        this.logger.log('Initialized Firebase Admin SDK using service account file.');
        return;
      }

      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
        });
        this.isInitialized = true;
        this.logger.log('Initialized Firebase Admin SDK using application default credentials.');
        return;
      }
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK', error as Error);
      return;
    }

    this.logger.warn('Firebase credentials not provided. Push notifications will be disabled.');
  }

  async sendToTokens(tokens: string[], notification: PushNotificationOptions, data?: Record<string, string>): Promise<void> {
    if (!tokens.length) {
      return;
    }

    if (!this.isInitialized) {
      this.logger.warn('Skipping FCM send because Firebase is not initialized.');
      return;
    }

    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification,
      data,
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      const failures = response.responses.filter((item) => !item.success);

      if (failures.length) {
        this.logger.warn(`FCM send completed with ${failures.length} failures.`);
        failures.forEach((failure, index) => {
          if (!failure.success) {
            this.logger.warn(`FCM failure ${index + 1}: ${failure.error?.message ?? 'Unknown error'}`);
          }
        });
      }
    } catch (error) {
      this.logger.error('Failed to send Firebase Cloud Messaging notification', error as Error);
    }
  }
}
