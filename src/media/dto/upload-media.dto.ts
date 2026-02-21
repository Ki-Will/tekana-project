import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { MediaType } from '@prisma/client';

export class UploadMediaDto {
  @ApiProperty({ description: 'Media type', enum: MediaType })
  @IsEnum(MediaType)
  type: MediaType;

  @ApiProperty({ description: 'File name', required: false })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiProperty({ description: 'Duration in seconds', required: false })
  @IsOptional()
  @IsString()
  duration?: string;
}
