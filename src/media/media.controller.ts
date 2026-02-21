import { Body, Controller, Get, Param, Post, Request, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MediaService } from './media.service';
import { UploadMediaDto } from './dto/upload-media.dto';

@ApiTags('Media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @Post('upload/:incidentId')
  @ApiOperation({ summary: 'Upload media file for an incident' })
  @ApiResponse({ status: 201, description: 'Media uploaded successfully' })
  async uploadMedia(@UploadedFile() file: any, @Param('incidentId') incidentId: string, @Body() dto: UploadMediaDto) {
    return this.mediaService.uploadMedia(incidentId, dto, file);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get media file by ID' })
  async getMedia(@Param('id') id: string) {
    return this.mediaService.getMedia(id);
  }

  @Get('incident/:incidentId')
  @ApiOperation({ summary: 'Get all media for an incident' })
  async getMediaForIncident(@Param('incidentId') incidentId: string) {
    return this.mediaService.getMediaForIncident(incidentId);
  }
}
