import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import * as admin from 'firebase-admin';
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
    // if (admin.apps.length > 0) {
    //   this.isInitialized = true;
    //   return;
    // }

    // const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    // const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
    // let privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');
    // const serviceAccountPath = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH');

    // try {
    //   if (projectId && clientEmail && privateKey) {
    //     if (privateKey.includes('\\n')) {
    //       privateKey = privateKey.replace(/\\n/g, '\n');
    //     }

    //     // admin.initializeApp({
    //     //   credential: admin.credential.cert({
    //     //     projectId,
    //     //     clientEmail,
    //     //     privateKey,
    //     //   }),
    //     // });
    //     // this.isInitialized = true;
    //     // this.logger.log('Initialized Firebase Admin SDK using environment variables.');
    //     // return;
    //   }

    //   if (serviceAccountPath) {
    //     if (!existsSync(serviceAccountPath)) {
    //       throw new Error(`Service account file not found at path: ${serviceAccountPath}`);
    //     }

    //     const serviceAccountRaw = readFileSync(serviceAccountPath, 'utf-8');
    //     const serviceAccount = JSON.parse(serviceAccountRaw);

    //     // admin.initializeApp({
    //     //   credential: admin.credential.cert(serviceAccount),
    //     // });
    //     // this.isInitialized = true;
    //     // this.logger.log('Initialized Firebase Admin SDK using service account file.');
    //   } else {
    //     // admin.initializeApp({
    //     //   credential: admin.credential.applicationDefault(),
    //     // });
    //     // this.isInitialized = true;
    //     // this.logger.log('Initialized Firebase Admin SDK using application default credentials.');
    //   }
    // } catch (error) {
    //   this.logger.error('Failed to initialize Firebase Admin SDK', error as Error);
    //   throw error;
    // }
  }

  // async sendToTokens(
  //   registrationTokens: string[],
  //   notification: PushNotificationOptions,
  //   data?: Record<string, string>,
  // ): Promise<void> {
  //   // if (!admin.apps.length) {
  //   //   throw new Error('Firebase Admin SDK not initialized');
  //   // }

  //   // const message: admin.messaging.MulticastMessage = {
  //   //   tokens: registrationTokens,
  //   //   notification: {
  //   //     title: notification.title,
  //   //     body: notification.body,
  //   //   },
  //   //   data: data || {},
  //   // };

  //   // try {
  //   //   const response = await admin.messaging().sendEachForMulticast(message);
  //   //   this.logger.log(`Successfully sent message: ${response.successCount} success, ${response.failureCount} failure`);
  //   //   if (response.failureCount > 0) {
  //   //     response.responses.forEach((resp, idx) => {
  //   //       if (!resp.success) {
  //   //         this.logger.error(`Failed to send to token ${registrationTokens[idx]}: ${resp.error?.message}`);
  //   //       }
  //   //     });
  //   //   }
  //   // } catch (error) {
  //   //   this.logger.error('Error sending multicast message', error as Error);
  //   //   throw error;
  //   // }
  // }
}
