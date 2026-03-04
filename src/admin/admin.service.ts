import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, ResponderProfile, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { CreateResponderProfileDto } from './dto/create-responder-profile.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getUsers(): Promise<User[]> {
    return this.prisma.user.findMany({
      include: { trustedContacts: true },
    });
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { trustedContacts: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUserRole(id: string, role: UserRole): Promise<User> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: { role },
      });

      return user;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw error;
    }
  }

  async getResponders(): Promise<ResponderProfile[]> {
    return this.prisma.responderProfile.findMany({
      include: { user: true },
    });
  }

  async getResponderById(id: string): Promise<ResponderProfile> {
    const responder = await this.prisma.responderProfile.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!responder) {
      throw new NotFoundException('Responder not found');
    }

    return responder;
  }

  async createResponderProfile(data: CreateResponderProfileDto): Promise<ResponderProfile> {
    let userId = data.userId;

    if (!userId && data.user) {
      try {
        const hashedPassword = await bcrypt.hash(data.user.password, 10);
        const user = await this.prisma.user.create({
          data: {
            name: data.user.name,
            email: data.user.email,
            phone: data.user.phone,
            password: hashedPassword,
            role: UserRole.COMMUNITY_RESPONDER, // Set appropriate role
          },
        });
        userId = user.id;
      } catch (error) {
        if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new BadRequestException('User with this email or phone already exists');
        }
        throw error;
      }
    }

    if (!userId) {
      throw new BadRequestException('User ID or user data required');
    }

    // Verify user exists
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const createData: any = {
      userId,
      responderType: data.responder.responderType,
      experienceYears: data.responder.experienceYears,
      certifications: data.responder.certifications,
      isAvailable: data.responder.isAvailable ?? true,
      currentLocationLat: data.responder.currentLocationLat,
      currentLocationLng: data.responder.currentLocationLng,
    };

    if (data.responder.specialization) {
      createData.specialization = data.responder.specialization;
    }

    const responder = await this.prisma.responderProfile.create({
      data: createData,
    });

    return responder;
  }

  async deleteResponder(id: string): Promise<void> {
    try {
      await this.prisma.responderProfile.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Responder not found');
      }
      throw error;
    }
  }

  async updateResponderStatus(id: string, data: {
    isAvailable?: boolean;
    isVerified?: boolean;
  }): Promise<ResponderProfile> {
    const updateData: any = {};
    if (data.isAvailable !== undefined) updateData.isAvailable = data.isAvailable;
    if (data.isVerified !== undefined) updateData.isVerified = data.isVerified;

    try {
      return await this.prisma.responderProfile.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Responder not found');
      }
      throw error;
    }
  }
}
