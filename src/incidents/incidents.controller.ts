import {
  Body,
  Controller,
  Get,
  Param,
  Query,
  Patch,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,

} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiQuery,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { IncidentsService } from './incidents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentStatusDto } from './dto/update-incident-status.dto';
import { AssignResponderDto } from './dto/assign-responder.dto';
import { FilterIncidentsDto } from './dto/filter-incidents.dto';
import { RequestEmergencyServiceDto } from './dto/request-emergency-service.dto';
import { RateLimitGuard } from '../auth/guards/rate-limit.guard';

@ApiTags('Incidents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @ApiOperation({ summary: 'Create a new incident (SOS alert)' })
  @ApiResponse({ status: 201, description: 'Incident created successfully' })
  async create(@Request() req, @Body() createIncidentDto: CreateIncidentDto) {
    return this.incidentsService.createIncident(req.user.id, createIncidentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve incidents with optional filters' })
  @ApiResponse({ status: 200, description: 'Incidents retrieved successfully' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  async findAll(
    @Query() filters: FilterIncidentsDto,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    const pagination = {
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    };

    return this.incidentsService.getIncidents(filters, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get incident details by ID' })
  @ApiResponse({ status: 200, description: 'Incident retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Incident not found' })
  async findOne(@Param('id') id: string) {
    return this.incidentsService.getIncidentById(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update incident status and severity' })
  @ApiResponse({
    status: 200,
    description: 'Incident status updated successfully',
  })
  async updateStatus(
    @Param('id') id: string,
    @Request() req,
    @Body() updateIncidentStatusDto: UpdateIncidentStatusDto,
  ) {
    return this.incidentsService.updateIncidentStatus(
      id,
      updateIncidentStatusDto,
      req.user.id,
    );
  }

  @Post(':id/responders')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'POLICE_OFFICER', 'EMERGENCY_DISPATCHER')
  @ApiOperation({ summary: 'Assign a responder to an incident' })
  @ApiResponse({ status: 201, description: 'Responder assigned successfully' })
  async assignResponder(
    @Param('id') id: string,
    @Body() assignResponderDto: AssignResponderDto,
  ) {
    return this.incidentsService.assignResponder(id, assignResponderDto);
  }

  @Post(':id/request-emergency-service')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request emergency service (ambulance or police) for an incident',
  })
  @ApiResponse({
    status: 200,
    description: 'Emergency service request forwarded',
  })
  async requestEmergencyService(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: RequestEmergencyServiceDto,
  ) {
    return this.incidentsService.requestEmergencyService(id, dto, req.user.id);
  }
}
