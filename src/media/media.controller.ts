import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MediaService } from './media.service';
import { UploadMediaDto } from './dto/upload-media.dto';

@ApiTags('Media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload/:incidentId')
  @ApiOperation({ summary: 'Upload media file for an incident' })
  @ApiResponse({ status: 201, description: 'Media uploaded successfully' })
  async uploadMedia(@Request() req, @Param('incidentId') incidentId: string, @Body() dto: UploadMediaDto) {
    return this.mediaService.uploadMedia(incidentId, dto);
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
