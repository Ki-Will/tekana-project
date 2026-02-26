import { IsEnum, IsOptional, IsString } from 'class-validator';

export class RequestEmergencyServiceDto {
  @IsEnum(['ambulance', 'police'])
  type: 'ambulance' | 'police';

  @IsOptional()
  @IsString()
  notes?: string;
}
