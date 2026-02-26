import { Controller, Get, Param, Patch, Post, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { Roles } from '../auth/guards/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User, ResponderProfile, UserRole } from '@prisma/client';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Roles('ADMIN')
  @Get('users')
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of users' })
  async getUsers(): Promise<User[]> {
    return this.adminService.getUsers();
  }

  @Roles('ADMIN')
  @Get('users/:id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User details' })
  async getUserById(@Param('id') id: string): Promise<User> {
    return this.adminService.getUserById(id);
  }

  @Roles('ADMIN')
  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Update user role' })
  @ApiBody({ schema: { type: 'object', properties: { role: { type: 'string', enum: Object.values(UserRole) } } } })
  @ApiResponse({ status: 200, description: 'User role updated' })
  async updateUserRole(@Param('id') id: string, @Body('role') role: UserRole): Promise<User> {
    return this.adminService.updateUserRole(id, role);
  }

  @Roles('ADMIN')
  @Get('responders')
  @ApiOperation({ summary: 'Get all responders' })
  @ApiResponse({ status: 200, description: 'List of responders' })
  async getResponders(): Promise<ResponderProfile[]> {
    return this.adminService.getResponders();
  }

  @Roles('ADMIN')
  @Get('responders/:id')
  @ApiOperation({ summary: 'Get responder by ID' })
  @ApiResponse({ status: 200, description: 'Responder details' })
  async getResponderById(@Param('id') id: string): Promise<ResponderProfile> {
    return this.adminService.getResponderById(id);
  }

  @Roles('ADMIN')
  @Post('responders/:userId')
  @ApiOperation({ summary: 'Create responder profile for user' })
  @ApiResponse({ status: 201, description: 'Responder profile created' })
  async createResponderProfile(
    @Param('userId') userId: string,
    @Body() data: {
      responderType: string;
      specialization?: string;
      experienceYears?: number;
      certifications?: string[];
      isAvailable?: boolean;
      currentLocationLat?: number;
      currentLocationLng?: number;
    },
  ): Promise<ResponderProfile> {
    return this.adminService.createResponderProfile(userId, data);
  }
}
