import { Module } from '@nestjs/common';
import { RespondersService } from './responders.service';
import { RespondersController } from './responders.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RespondersController],
  providers: [RespondersService],
  exports: [RespondersService],
})
export class RespondersModule {}
