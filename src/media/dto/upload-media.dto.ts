import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { MediaType } from '@prisma/client';

export class UploadMediaDto {
  @ApiProperty({ description: 'File path or base64 data', required: false })
  @IsOptional()
  @IsString()
  fileData?: string;

  @ApiProperty({ description: 'Media type', enum: MediaType })
  @IsEnum(MediaType)
  type: MediaType;

  @ApiProperty({ description: 'Optional file name', required: false })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiProperty({ description: 'Optional duration for audio/video', required: false })
  @IsOptional()
  @IsString()
  duration?: string;
}
