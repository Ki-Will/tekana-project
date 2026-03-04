import { Controller, Get, Param, Patch, Post, Delete, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { Roles } from '../auth/guards/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User, ResponderProfile, UserRole } from '@prisma/client';
import { CreateResponderProfileDto } from './dto/create-responder-profile.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

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
  @Post('responders')
  @ApiOperation({ summary: 'Create responder profile, optionally creating user' })
  @ApiResponse({ status: 201, description: 'Responder profile created' })
  async createResponderProfile(@Body() data: CreateResponderProfileDto): Promise<ResponderProfile> {
    return this.adminService.createResponderProfile(data);
  }

  @Roles('ADMIN')
  @Delete('responders/:id')
  @ApiOperation({ summary: 'Delete responder profile' })
  @ApiResponse({ status: 200, description: 'Responder deleted' })
  async deleteResponder(@Param('id') id: string) {
    await this.adminService.deleteResponder(id);
    return { message: 'Responder deleted' };
  }

  @Roles('ADMIN')
  @Patch('responders/:id/status')
  @ApiOperation({ summary: 'Update responder status' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateResponderStatus(
    @Param('id') id: string,
    @Body() data: { isAvailable?: boolean; isVerified?: boolean },
  ): Promise<ResponderProfile> {
    return this.adminService.updateResponderStatus(id, data);
  }
}
