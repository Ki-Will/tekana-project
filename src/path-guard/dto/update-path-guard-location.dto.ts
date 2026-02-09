import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional } from 'class-validator';

export class UpdatePathGuardLocationDto {
  @ApiProperty({ description: 'Current latitude reported by the device' })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Current longitude reported by the device' })
  @IsNumber()
  longitude: number;

  @ApiProperty({ description: 'Current speed in meters per second', required: false })
  @IsOptional()
  @IsNumber()
  speed?: number;

  @ApiProperty({ description: 'Current heading in degrees', required: false })
  @IsOptional()
  @IsNumber()
  heading?: number;

  @ApiProperty({ description: 'Horizontal accuracy in meters', required: false })
  @IsOptional()
  @IsNumber()
  accuracy?: number;
}
