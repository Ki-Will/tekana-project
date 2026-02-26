import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class CreateUserDto {
  @ApiProperty({ description: 'User name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'User email' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ description: 'User phone' })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'User password' })
  @IsString()
  password: string;
}

class CreateResponderDto {
  @ApiProperty({ description: 'Responder type' })
  @IsString()
  responderType: string;

  @ApiPropertyOptional({ description: 'Specialization' })
  @IsOptional()
  @IsString()
  specialization?: string;

  @ApiPropertyOptional({ description: 'Years of experience' })
  @IsOptional()
  @IsNumber()
  experienceYears?: number;

  @ApiPropertyOptional({ description: 'Certifications' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @ApiPropertyOptional({ description: 'Availability status', default: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ description: 'Current location latitude' })
  @IsOptional()
  @IsNumber()
  currentLocationLat?: number;

  @ApiPropertyOptional({ description: 'Current location longitude' })
  @IsOptional()
  @IsNumber()
  currentLocationLng?: number;
}

export class CreateResponderProfileDto {
  @ApiPropertyOptional({ description: 'Existing user ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'User data to create new user' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateUserDto)
  user?: CreateUserDto;

  @ApiProperty({ description: 'Responder profile data' })
  @ValidateNested()
  @Type(() => CreateResponderDto)
  responder: CreateResponderDto;
}
