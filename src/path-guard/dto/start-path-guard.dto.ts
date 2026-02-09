import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive } from 'class-validator';

export class StartPathGuardDto {
  @ApiProperty({ description: 'Starting latitude for the PathGuard session' })
  @IsNumber()
  startLocationLat: number;

  @ApiProperty({ description: 'Starting longitude for the PathGuard session' })
  @IsNumber()
  startLocationLng: number;

  @ApiProperty({ description: 'Destination latitude', required: false })
  @IsOptional()
  @IsNumber()
  destinationLat?: number;

  @ApiProperty({ description: 'Destination longitude', required: false })
  @IsOptional()
  @IsNumber()
  destinationLng?: number;

  @ApiProperty({ description: 'Allowed deviation threshold in meters', default: 50, required: false })
  @IsOptional()
  @IsPositive()
  deviationThreshold?: number;

  @ApiProperty({ description: 'Immobility timeout in seconds', default: 300, required: false })
  @IsOptional()
  @IsPositive()
  immobilityTimeout?: number;

}
