import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PathGuardService } from './path-guard.service';
import { StartPathGuardDto } from './dto/start-path-guard.dto';
import { UpdatePathGuardLocationDto } from './dto/update-path-guard-location.dto';

@ApiTags('PathGuard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('path-guard')
export class PathGuardController {
  constructor(private readonly pathGuardService: PathGuardService) {}

  @Post('start')
  @ApiOperation({ summary: 'Start a new PathGuard session' })
  @ApiResponse({ status: 201, description: 'PathGuard session started successfully' })
  async startSession(@Request() req, @Body() dto: StartPathGuardDto) {
    return this.pathGuardService.startSession(req.user.id, dto);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get the active PathGuard session for current user' })
  @ApiResponse({ status: 200, description: 'Active session details' })
  async getActiveSession(@Request() req) {
    return this.pathGuardService.getActiveSession(req.user.id);
  }

  @Post(':sessionId/location')
  @ApiOperation({ summary: 'Report current location for an active PathGuard session' })
  @ApiResponse({ status: 201, description: 'Location update recorded. Returns whether an emergency was triggered.' })
  async reportLocation(
    @Request() req,
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdatePathGuardLocationDto,
  ) {
    return this.pathGuardService.updateLocation(req.user.id, sessionId, dto);
  }

  @Patch(':sessionId/complete')
  @ApiOperation({ summary: 'Complete or cancel an active PathGuard session' })
  @ApiResponse({ status: 200, description: 'PathGuard session completed successfully' })
  async completeSession(@Request() req, @Param('sessionId') sessionId: string) {
    return this.pathGuardService.completeSession(req.user.id, sessionId);
  }
}
