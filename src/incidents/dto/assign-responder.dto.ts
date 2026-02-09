import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class AssignResponderDto {
  @ApiProperty({ description: 'Responder profile ID to assign to the incident' })
  @IsString()
  responderId: string;

  @ApiProperty({ description: 'Notes for the responder assignment', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
