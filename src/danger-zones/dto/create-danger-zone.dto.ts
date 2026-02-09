import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { DangerType, Severity } from '@prisma/client';

export class CreateDangerZoneDto {
  @ApiProperty({ description: 'Latitude of the danger zone' })
  @IsNumber()
  locationLat: number;

  @ApiProperty({ description: 'Longitude of the danger zone' })
  @IsNumber()
  locationLng: number;

  @ApiProperty({ description: 'Human-readable address', required: false })
  @IsOptional()
  @IsString()
  locationAddress?: string;

  @ApiProperty({ description: 'Type of danger', enum: DangerType })
  @IsEnum(DangerType)
  dangerType: DangerType;

  @ApiProperty({ description: 'Detailed description of the danger' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Severity level', enum: Severity, default: Severity.MEDIUM, required: false })
  @IsOptional()
  @IsEnum(Severity)
  severity?: Severity = Severity.MEDIUM;
}
