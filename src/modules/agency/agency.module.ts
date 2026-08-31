import { Module } from '@nestjs/common';
import { AgencyController } from './agency.controller';
import { AgencyService } from './agency.service';
import { PrismaService } from '../../shared/database/prisma.service';

@Module({
  controllers: [AgencyController],
  providers: [AgencyService, PrismaService],
  exports: [AgencyService],
})
export class AgencyModule {}
