import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateTrustedContactDto } from './dto/create-trusted-contact.dto';
import { UserRole } from '@prisma/client';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/guards/roles.decorator';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  create(@Body() createUserDto: any) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users with pagination' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: UserRole,
    @Query('search') search?: string,
  ) {
    const skip = page && limit ? (parseInt(page) - 1) * parseInt(limit) : undefined;
    const take = limit ? parseInt(limit) : undefined;
    
    const where: any = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.usersService.findAll({
      skip,
      take,
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('responders')
  @ApiOperation({ summary: 'Get all active community responders' })
  @ApiResponse({ status: 200, description: 'Responders retrieved successfully' })
  getActiveResponders() {
    return this.usersService.getActiveResponders();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search users by name, phone, or email' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  searchUsers(@Query('q') query: string) {
    return this.usersService.searchUsers(query);
  }

  @Get('role/:role')
  @ApiOperation({ summary: 'Get users by role' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  getUsersByRole(@Param('role') role: UserRole) {
    return this.usersService.getUsersByRole(role);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  getProfile(@Request() req) {
    return this.usersService.findOne(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user information' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate user account' })
  @ApiResponse({ status: 200, description: 'User deactivated successfully' })
  deactivateUser(@Param('id') id: string) {
    return this.usersService.deactivateUser(id);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate user account' })
  @ApiResponse({ status: 200, description: 'User activated successfully' })
  activateUser(@Param('id') id: string) {
    return this.usersService.activateUser(id);
  }

  @Patch(':id/role')
  // @UseGuards(RolesGuard)
  // @Roles('SUPER_ADMIN', 'ADMIN', 'EMERGENCY_DISPATCHER')
  @ApiOperation({ summary: 'Update user role' })
  @ApiParam({ name: 'id', description: 'User ID to update role for' })
  @ApiBody({ schema: { type: 'object', properties: { role: { type: 'string', enum: ['CITIZEN', 'COMMUNITY_RESPONDER', 'POLICE_OFFICER', 'ADMIN', 'SUPER_ADMIN', 'EMERGENCY_DISPATCHER', 'MEDICAL_RESPONDER', 'FIRE_RESPONDER'] } } } })
  @ApiResponse({ status: 200, description: 'User role updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  updateUserRole(@Param('id') id: string, @Body('role') role: UserRole) {
    return this.usersService.updateUserRole(id, role);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  // Trusted Contacts endpoints
  @Post(':id/trusted-contacts')
  @ApiOperation({ summary: 'Add trusted contact for user' })
  @ApiResponse({ status: 201, description: 'Trusted contact added successfully' })
  addTrustedContact(@Param('id') userId: string, @Body() createTrustedContactDto: CreateTrustedContactDto) {
    return this.usersService.addTrustedContact(userId, createTrustedContactDto);
  }

  @Get(':id/trusted-contacts')
  @ApiOperation({ summary: 'Get user trusted contacts' })
  @ApiResponse({ status: 200, description: 'Trusted contacts retrieved successfully' })
  getTrustedContacts(@Param('id') userId: string) {
    return this.usersService.getTrustedContacts(userId);
  }

  @Delete(':id/trusted-contacts/:contactId')
  @ApiOperation({ summary: 'Remove trusted contact' })
  @ApiResponse({ status: 200, description: 'Trusted contact removed successfully' })
  removeTrustedContact(@Param('id') userId: string, @Param('contactId') contactId: string) {
    return this.usersService.removeTrustedContact(userId, contactId);
  }

  @Get(':id/notifications')
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
  getUserNotifications(@Param('id') userId: string) {
    return this.usersService.getUserNotifications(userId);
  }
}
