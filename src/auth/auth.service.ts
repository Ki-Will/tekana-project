import { Injectable, UnauthorizedException, ConflictException, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(phone: string, password?: string): Promise<User | null> {
    if (!phone) {
      return null;
    }
    const normalizedPhone = this.normalizePhone(phone);
    const user = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });

    if (!user || !user.isActive) {
      return null;
    }

    // For phone-based authentication (OTP), we might not need password
    if (password) {
      if (!user.password) {
        return null;
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return null;
      }
    }

    return user;
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { phone, password, otp } = loginDto;
    
    const user = await this.validateUser(phone, password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const payload = {
      sub: user.id,
      phone: user.phone,
      role: user.role,
    };

    const token = this.jwtService.sign(payload);
    const expiresInSeconds = this.configService.get<number>('JWT_EXPIRES_IN_SECONDS', 60 * 60 * 24 * 7);
    const expiresIn = `${expiresInSeconds}s`;

    return {
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email ?? undefined,
        role: user.role,
        isVerified: user.isVerified,
        lastLoginAt: user.lastLoginAt ?? undefined,
        createdAt: user.createdAt,
      },
      token,
      expiresIn,
    };
  }

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { phone, name, email, password, role = UserRole.CITIZEN } = registerDto;

    const normalizedPhone = this.normalizePhone(phone);

    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phone: normalizedPhone },
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this phone or email already exists');
    }

    // Hash password if provided
    let hashedPassword: string | undefined;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const user = await this.prisma.user.create({
      data: {
        phone,
        name,
        email,
        password: hashedPassword,
        role,
      },
    });

    const payload = {
      sub: user.id,
      phone: user.phone,
      role: user.role,
    };

    const token = this.jwtService.sign(payload);
    const expiresInSeconds = this.configService.get<number>('JWT_EXPIRES_IN_SECONDS', 60 * 60 * 24 * 7);
    const expiresIn = `${expiresInSeconds}s`;

    return {
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email ?? undefined,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
      token,
      expiresIn,
    };
  }

  async verifyPhone(phone: string, otp: string): Promise<boolean> {
    const normalizedPhone = this.normalizePhone(phone);
    const user = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // OTP verification disabled for Wi-Fi independence
    // const otpKey = this.buildOtpCacheKey(normalizedPhone);
    // const storedEntry = await this.redisService.get<{ code: string; attempts: number }>(otpKey);

    // if (!storedEntry) {
    //   throw new UnauthorizedException('OTP expired or not found');
    // }

    // if (!this.isValidOtpFormat(otp)) {
    //   await this.incrementOtpAttempts(otpKey, storedEntry);
    //   throw new UnauthorizedException('Invalid OTP format');
    // }

    // if (storedEntry.code !== otp) {
    //   await this.incrementOtpAttempts(otpKey, storedEntry);
    //   throw new UnauthorizedException('Invalid OTP');
    // }

    // await this.redisService.del(otpKey);

    if (!user.isVerified) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });
    }

    return true;
  }

  async sendOtp(phone: string): Promise<void> {
    const normalizedPhone = this.normalizePhone(phone);
    const user = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // OTP sending disabled for Wi-Fi independence
    // const otpKey = this.buildOtpCacheKey(normalizedPhone);
    // const rateLimitKey = `${otpKey}:cooldown`;
    // const otpTtl = this.configService.get<number>('OTP_TTL_SECONDS', 300);
    // const resendCooldown = this.configService.get<number>('OTP_RESEND_COOLDOWN_SECONDS', 60);
    // const maxAttempts = this.configService.get<number>('OTP_MAX_ATTEMPTS', 5);

    // const existingCooldown = await this.redisService.get<string>(rateLimitKey);
    // if (existingCooldown) {
    //   throw new HttpException('OTP already sent. Please wait before requesting again.', HttpStatus.TOO_MANY_REQUESTS);
    // }

    // const otpCode = this.generateOtpCode();
    // await this.redisService.set(
    //   otpKey,
    //   {
    //     code: otpCode,
    //     attempts: 0,
    //     maxAttempts,
    //   },
    //   otpTtl,
    // );

    // await this.redisService.set(rateLimitKey, '1', resendCooldown);

    // await this.rabbitMQService.publish('auth.otp.sent', {
    //   userId: user.id,
    //   phone: normalizedPhone,
    //   code: otpCode,
    //   ttlSeconds: otpTtl,
    //   sentAt: new Date().toISOString(),
    // });
  }

  async refreshToken(user: User): Promise<AuthResponseDto> {
    const payload = {
      sub: user.id,
      phone: user.phone,
      role: user.role,
    };

    const token = this.jwtService.sign(payload);
    const expiresInSeconds = this.configService.get<number>('JWT_EXPIRES_IN_SECONDS', 60 * 60 * 24 * 7);
    const expiresIn = `${expiresInSeconds}s`;

    return {
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email ?? undefined,
        role: user.role,
        isVerified: user.isVerified,
        lastLoginAt: user.lastLoginAt ?? undefined,
        createdAt: user.createdAt,
      },
      token,
      expiresIn,
    };
  }

  async logout(userId: string): Promise<void> {
    // In a real implementation, you might want to:
    // 1. Add the token to a blacklist
    // 2. Remove device tokens
    // 3. Update user status
    
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  private normalizePhone(phone: string): string {
    return phone ? phone.replace(/\s+/g, '') : '';
  }

  private buildOtpCacheKey(phone: string): string {
    return `auth:otp:${phone}`;
  }

  private generateOtpCode(): string {
    const digits = this.configService.get<number>('OTP_LENGTH', 6);
    const min = 10 ** (digits - 1);
    const max = 10 ** digits - 1;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }

  private isValidOtpFormat(otp: string): boolean {
    const digits = this.configService.get<number>('OTP_LENGTH', 6);
    const otpRegex = new RegExp(`^\\d{${digits}}$`);
    return otpRegex.test(otp);
  }

  // private async incrementOtpAttempts(
  //   otpKey: string,
  //   entry: { code: string; attempts: number; maxAttempts?: number },
  // ): Promise<void> {
  //   const maxAttempts = entry.maxAttempts ?? this.configService.get<number>('OTP_MAX_ATTEMPTS', 5);
  //   const attempts = entry.attempts + 1;

  //   if (attempts >= maxAttempts) {
  //     await this.redisService.del(otpKey);
  //     throw new UnauthorizedException('OTP attempts exceeded');
  //   }

  //   await this.redisService.set(
  //     otpKey,
  //     {
  //       ...entry,
  //       attempts,
  //       maxAttempts,
  //     },
  //   );
  // }
}
