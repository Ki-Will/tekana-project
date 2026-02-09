import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsPhoneNumber } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'User phone number',
    example: '+250788123456',
  })
  @IsString()
  @IsPhoneNumber('RW')
  phone: string;

  @ApiProperty({
    description: 'User password (optional for OTP-based login)',
    example: 'password123',
    required: false,
  })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({
    description: 'One-time password (alternative to password)',
    example: '123456',
    required: false,
  })
  @IsOptional()
  @IsString()
  otp?: string;
}
