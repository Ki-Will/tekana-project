import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, IsArray } from 'class-validator';

export class UpdateResponderProfileDto {
  @ApiProperty({ description: 'Whether the responder is available', required: false })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiProperty({ description: 'Current location latitude', required: false })
  @IsOptional()
  @IsNumber()
  currentLocationLat?: number;

  @ApiProperty({ description: 'Current location longitude', required: false })
  @IsOptional()
  @IsNumber()
  currentLocationLng?: number;

  @ApiProperty({ description: 'Response radius in meters', required: false })
  @IsOptional()
  @IsNumber()
  responseRadius?: number;

  @ApiProperty({ description: 'Skills array', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiProperty({ description: 'Certifications array', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @ApiProperty({ description: 'Verification document path', required: false })
  @IsOptional()
  @IsString()
  verificationDocument?: string;
}
