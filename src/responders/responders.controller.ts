import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RespondersService } from './responders.service';
import { UpdateResponderProfileDto } from './dto/update-responder-profile.dto';
import { ActionStatus } from '@prisma/client';
import { Roles } from 'src/auth/guards/roles.decorator';

@ApiTags('Responders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('responders')
@Roles('RESPONDER', 'ADMIN')
export class RespondersController {
  constructor(private readonly respondersService: RespondersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user responder profile' })
  async getProfile(@Request() req) {
    return this.respondersService.getProfile(req.user.id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update responder profile' })
  async updateProfile(@Request() req, @Body() dto: UpdateResponderProfileDto) {
    return this.respondersService.updateProfile(req.user.id, dto);
  }

  @Post('profile/verify')
  @ApiOperation({ summary: 'Verify responder profile (admin only)' })
  async verifyProfile(@Request() req) {
    return this.respondersService.verifyProfile(req.user.id);
  }

  @Get('actions')
  @ApiOperation({ summary: 'Get responder actions' })
  @ApiQuery({ name: 'incidentId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ActionStatus })
  async getActions(
    @Request() req,
    @Query('incidentId') incidentId?: string,
    @Query('status') status?: ActionStatus,
  ) {
    return this.respondersService.getActions(req.user.id, { incidentId, status });
  }

  @Post('actions/:actionId/complete')
  @ApiOperation({ summary: 'Complete a responder action' })
  async completeAction(
    @Request() req,
    @Param('actionId') actionId: string,
    @Body('notes') notes?: string,
  ) {
    return this.respondersService.completeAction(req.user.id, actionId, notes);
  }

  @Get('nearby-incidents')
  @ApiOperation({ summary: 'Get nearby incidents for response' })
  async getNearbyIncidents(@Request() req) {
    return this.respondersService.getNearbyIncidents(req.user.id);
  }
}
