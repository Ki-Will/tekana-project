import { ApiProperty } from '@nestjs/swagger';
import { IncidentType, Severity } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, IsBoolean } from 'class-validator';

export class CreateIncidentDto {
  @ApiProperty({ description: 'Incident type', enum: IncidentType })
  @IsEnum(IncidentType)
  type: IncidentType;

  @ApiProperty({ description: 'Incident severity level', enum: Severity, required: false, default: Severity.MEDIUM })
  @IsOptional()
  @IsEnum(Severity)
  severity?: Severity = Severity.MEDIUM;

  @ApiProperty({ description: 'Incident title', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Detailed description of the incident', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Latitude of the incident location', example: -1.9441 })
  @IsNumber()
  locationLat: number;

  @ApiProperty({ description: 'Longitude of the incident location', example: 30.0619 })
  @IsNumber()
  locationLng: number;

  @ApiProperty({ description: 'Human-readable address of the incident', required: false })
  @IsOptional()
  @IsString()
  locationAddress?: string;

  @ApiProperty({ description: 'Whether the alert was sent silently', default: false, required: false })
  @IsOptional()
  @IsBoolean()
  isSilentSOS?: boolean = false;

  @ApiProperty({ description: 'Whether the alert was sent offline via SMS/USSD', default: false, required: false })
  @IsOptional()
  @IsBoolean()
  isOfflineAlert?: boolean = false;

  @ApiProperty({ description: 'PathGuard session ID linked to this incident', required: false })
  @IsOptional()
  @IsString()
  pathGuardSessionId?: string;
}
