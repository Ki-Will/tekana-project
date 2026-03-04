import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as cloudinary from 'cloudinary';

@Injectable()
export class UserRecordingsService implements OnModuleInit {
  private cloudinary: any;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    console.log('UserRecordingsService constructor called');
  }

  onModuleInit() {
    try {
      this.cloudinary = cloudinary.v2;
      this.cloudinary.config({
        cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
        api_key: this.configService.get('CLOUDINARY_API_KEY'),
        api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
      });
    } catch (error) {
      console.error('Cloudinary config error:', error);
    }
  }

  async uploadRecording(userId: string, file: any, location?: string): Promise<any> {
    console.log('Uploading file to cloudinary:', file.originalname);
    try {
      const dataUri = `data:video/mp4;base64,${file.buffer.toString('base64')}`;
      const result = await this.cloudinary.uploader.upload(dataUri, {
        folder: 'recordings',
        resource_type: 'video',
        public_id: `${Date.now()}_${file.originalname.split('.')[0]}`,
      });
      const videoUrl = result.secure_url;

      const recording = await this.prisma.userRecording.create({
        data: {
          userId,
          videoUrl,
          audioUrl: null,
          location: location || "Kigali",
          time: new Date().toISOString().split('T')[0],
        },
      });
      return recording;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw error;
    }
  }

  async getUserRecordings(userId: string) {
    return this.prisma.userRecording.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteRecording(userId: string, recordingId: string) {
    const recording = await this.prisma.userRecording.findFirst({
      where: { id: recordingId, userId },
    });
    if (!recording) throw new Error('Recording not found');

    const urlParts = recording.videoUrl.split('/');
    const publicId = urlParts[urlParts.length - 1].split('.')[0];

    await cloudinary.v2.uploader.destroy(publicId, { resource_type: 'video' });

    await this.prisma.userRecording.delete({
      where: { id: recordingId },
    });

    return { message: 'Recording deleted' };
  }
}
