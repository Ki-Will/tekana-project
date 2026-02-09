import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, UserRole, Prisma } from '@prisma/client';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateTrustedContactDto } from './dto/create-trusted-contact.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.UserCreateInput): Promise<User> {
    try {
      return await this.prisma.user.create({
        data,
        include: {
          trustedContacts: true,
          responderProfile: true,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('User with this phone or email already exists');
      }
      throw error;
    }
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }) {
    const { skip, take, where, orderBy } = params;
    
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take,
        where,
        orderBy,
        select: {
          id: true,
          phone: true,
          name: true,
          email: true,
          role: true,
          isVerified: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              incidents: true,
              trustedContacts: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      page: skip ? Math.floor(skip / (take || 10)) + 1 : 1,
      totalPages: Math.ceil(total / (take || 10)),
    };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        trustedContacts: true,
        responderProfile: true,
        incidents: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        deviceTokens: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { phone },
      include: {
        trustedContacts: true,
        responderProfile: true,
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    try {
      return await this.prisma.user.update({
        where: { id },
        data: updateUserDto,
        include: {
          trustedContacts: true,
          responderProfile: true,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('User with this phone or email already exists');
      }
      if (error.code === 'P2025') {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.user.delete({
        where: { id },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      throw error;
    }
  }

  async deactivateUser(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async activateUser(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async updateUserRole(id: string, role: UserRole): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { role },
    });
  }

  async addTrustedContact(userId: string, createTrustedContactDto: CreateTrustedContactDto) {
    return this.prisma.trustedContact.create({
      data: {
        ...createTrustedContactDto,
        userId,
      },
    });
  }

  async getTrustedContacts(userId: string) {
    return this.prisma.trustedContact.findMany({
      where: { userId },
      orderBy: { isPrimary: 'desc' },
    });
  }

  async removeTrustedContact(userId: string, contactId: string) {
    return this.prisma.trustedContact.delete({
      where: {
        id: contactId,
        userId,
      },
    });
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  async getUsersByRole(role: UserRole) {
    return this.prisma.user.findMany({
      where: { role, isActive: true },
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        role: true,
        isVerified: true,
        responderProfile: role === UserRole.COMMUNITY_RESPONDER,
      },
    });
  }

  async getActiveResponders() {
    return this.prisma.user.findMany({
      where: {
        role: UserRole.COMMUNITY_RESPONDER,
        isActive: true,
        responderProfile: {
          isAvailable: true,
        },
      },
      include: {
        responderProfile: true,
      },
    });
  }

  async searchUsers(query: string) {
    return this.prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
        isActive: true,
      },
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        role: true,
        isVerified: true,
      },
      take: 20,
    });
  }
}
