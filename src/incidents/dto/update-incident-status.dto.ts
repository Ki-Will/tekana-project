import { ApiProperty } from '@nestjs/swagger';
import { IncidentStatus, Severity } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateIncidentStatusDto {
  @ApiProperty({ description: 'Updated incident status', enum: IncidentStatus })
  @IsEnum(IncidentStatus)
  status: IncidentStatus;

  @ApiProperty({ description: 'Optional updated severity level', enum: Severity, required: false })
  @IsOptional()
  @IsEnum(Severity)
  severity?: Severity;

  @ApiProperty({ description: 'Optional resolution notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
