import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsEmail } from 'class-validator';

export class CreateTrustedContactDto {
  @ApiProperty({
    description: 'Contact name',
    example: 'Jane Doe',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Contact phone number',
    example: '+250788654321',
  })
  @IsString()
  phone: string;

  @ApiProperty({
    description: 'Relationship to user',
    example: 'Sister',
    required: false,
  })
  @IsOptional()
  @IsString()
  relationship?: string;

  @ApiProperty({
    description: 'Whether this is the primary contact',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean = false;
}
