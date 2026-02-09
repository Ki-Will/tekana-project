import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class AuthResponseDto {
  @ApiProperty({
    description: 'User information',
    example: {
      id: 'user123',
      phone: '+250788123456',
      name: 'John Doe',
      email: 'john.doe@example.com',
      role: UserRole.CITIZEN,
      isVerified: true,
    },
  })
  user: {
    id: string;
    phone: string;
    name: string;
    email?: string;
    role: UserRole;
    isVerified: boolean;
  };

  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token: string;

  @ApiProperty({
    description: 'Token expiration time',
    example: '7d',
  })
  expiresIn: string;
}
