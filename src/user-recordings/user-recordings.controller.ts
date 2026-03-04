import { Controller, Post, Get, Delete, Param, UseGuards, UseInterceptors, UploadedFile, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRecordingsService } from './user-recordings.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { RecordingsGateway } from '../recordings/recordings.gateway';

@ApiTags('User Recordings')
@Controller('user-recordings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserRecordingsController {
  constructor(private readonly userRecordingsService: UserRecordingsService, private readonly recordingsGateway: RecordingsGateway) {
    console.log('UserRecordingsController constructor called');
  }

  @Post('upload/:userId')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a video recording' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Recording uploaded successfully' })
  async uploadRecording(
    @Param('userId') userId: string,
    @UploadedFile() file: any,
    @Body() body: any,
  ) {
    console.log('Upload recording called for user', userId, 'file', file ? file.originalname : 'no file');
    const recording = await this.userRecordingsService.uploadRecording(userId, file, body.location);
    this.recordingsGateway.emitRecordingAdded(userId, recording);
    return recording;
  }

  @UseGuards()
  @Get(':userId')
  @ApiOperation({ summary: 'Get user recordings' })
  @ApiResponse({ status: 200, description: 'Recordings retrieved successfully' })
  async getUserRecordings(@Param('userId') userId: string) {
    console.log('Get recordings called for userId:', userId);
    return this.userRecordingsService.getUserRecordings(userId);
  }

  @Delete(':userId/:recordingId')
  @ApiOperation({ summary: 'Delete a recording' })
  @ApiResponse({ status: 200, description: 'Recording deleted successfully' })
  async deleteRecording(
    @Param('userId') userId: string,
    @Param('recordingId') recordingId: string,
  ) {
    return this.userRecordingsService.deleteRecording(userId, recordingId);
  }
}
