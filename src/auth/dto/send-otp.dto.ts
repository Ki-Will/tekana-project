import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsPhoneNumber } from 'class-validator';

export class SendOtpDto {
  @ApiProperty({
    description: 'Phone number to send OTP to',
    example: '+250788123456',
  })
  @IsString()
  @IsPhoneNumber('RW')
  phone: string;
}
