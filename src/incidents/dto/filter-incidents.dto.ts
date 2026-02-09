import { ApiPropertyOptional } from '@nestjs/swagger';
import { IncidentStatus, IncidentType, Severity } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';

export class FilterIncidentsDto {
  @ApiPropertyOptional({ description: 'Filter by incident status', enum: IncidentStatus })
  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;

  @ApiPropertyOptional({ description: 'Filter by incident type', enum: IncidentType })
  @IsOptional()
  @IsEnum(IncidentType)
  type?: IncidentType;

  @ApiPropertyOptional({ description: 'Filter by severity', enum: Severity })
  @IsOptional()
  @IsEnum(Severity)
  severity?: Severity;

  @ApiPropertyOptional({ description: 'Filter to silent SOS incidents' })
  @IsOptional()
  @IsBoolean()
  isSilentSOS?: boolean;

  @ApiPropertyOptional({ description: 'Filter to offline alerts' })
  @IsOptional()
  @IsBoolean()
  isOfflineAlert?: boolean;

  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter by responder ID' })
  @IsOptional()
  @IsString()
  responderId?: string;
}
