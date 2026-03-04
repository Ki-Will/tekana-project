import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, ResponderProfile, UserRole } from '@prisma/client';

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
    const user = await this.prisma.user.update({
      where: { id },
      data: { role },
    });

    return user;
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

  async createResponderProfile(userId: string, data: {
    responderType: string;
    specialization?: string;
    experienceYears?: number;
    certifications?: string[];
    isAvailable?: boolean;
    currentLocationLat?: number;
    currentLocationLng?: number;
  }): Promise<ResponderProfile> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const createData: any = {
      userId,
      responderType: data.responderType,
      experienceYears: data.experienceYears,
      certifications: data.certifications,
      isAvailable: data.isAvailable ?? true,
      currentLocationLat: data.currentLocationLat,
      currentLocationLng: data.currentLocationLng,
    };

    if (data.specialization) {
      createData.specialization = data.specialization;
    }

    const responder = await this.prisma.responderProfile.create({
      data: createData,
    });

    return responder;
  }
}
