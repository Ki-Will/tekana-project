import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DangerZonesService } from './danger-zones.service';
import { CreateDangerZoneDto } from './dto/create-danger-zone.dto';
import { DangerType, Severity } from '@prisma/client';

@ApiTags('Danger Zones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('danger-zones')
export class DangerZonesController {
  constructor(private readonly dangerZonesService: DangerZonesService) {}

  @Post()
  @ApiOperation({ summary: 'Report a new danger zone' })
  @ApiResponse({ status: 201, description: 'Danger zone reported successfully' })
  async create(@Request() req, @Body() dto: CreateDangerZoneDto) {
    return this.dangerZonesService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get danger zones with optional filters' })
  @ApiQuery({ name: 'dangerType', required: false, enum: DangerType })
  @ApiQuery({ name: 'severity', required: false, enum: Severity })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('dangerType') dangerType?: DangerType,
    @Query('severity') severity?: Severity,
    @Query('userId') userId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const skip = page && limit ? (parseInt(page) - 1) * parseInt(limit) : undefined;
    const take = limit ? parseInt(limit) : undefined;

    return this.dangerZonesService.findAll({
      dangerType,
      severity,
      userId,
      skip,
      take,
    });
  }

  @Get('aggregated')
  @ApiOperation({ summary: 'Get aggregated danger zones for mapping' })
  async getAggregatedZones() {
    return this.dangerZonesService.getAggregatedZones();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific danger zone' })
  async findOne(@Param('id') id: string) {
    return this.dangerZonesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a danger zone' })
  async update(@Param('id') id: string, @Body() updateData: Partial<CreateDangerZoneDto>) {
    return this.dangerZonesService.update(id, updateData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a danger zone' })
  async remove(@Param('id') id: string) {
    await this.dangerZonesService.remove(id);
    return { message: 'Danger zone deleted successfully' };
  }
}
