import { Body, Controller, Delete, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DeviceTokensService } from './device-tokens.service';
import { CreateDeviceTokenDto } from './dto/create-device-token.dto';

@ApiTags('Device Tokens')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('device-tokens')
export class DeviceTokensController {
  constructor(private readonly deviceTokensService: DeviceTokensService) {}

  @Post()
  @ApiOperation({ summary: 'Register a device token for push notifications' })
  @ApiResponse({ status: 201, description: 'Device token registered successfully' })
  async registerToken(@Request() req, @Body() dto: CreateDeviceTokenDto) {
    return this.deviceTokensService.registerToken(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get active device tokens for current user' })
  async getActiveTokens(@Request() req) {
    return this.deviceTokensService.getActiveTokens(req.user.id);
  }

  @Delete(':token')
  @ApiOperation({ summary: 'Deactivate a device token' })
  async removeToken(@Request() req, @Param('token') token: string) {
    await this.deviceTokensService.removeToken(req.user.id, token);
    return { message: 'Device token deactivated successfully' };
  }
}
