import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { DeviceType } from '@prisma/client';

export class CreateDeviceTokenDto {
  @ApiProperty({ description: 'Firebase device token' })
  @IsString()
  token: string;

  @ApiProperty({ description: 'Device type', enum: DeviceType })
  @IsEnum(DeviceType)
  deviceType: DeviceType;
}
