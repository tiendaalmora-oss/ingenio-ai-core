import { Module } from '@nestjs/common';
import { AgencyController } from './agency.controller';
import { AgencyService } from './agency.service';
import { WahaWatchdogService } from './waha-watchdog.service';
import { PrismaService } from '../../shared/database/prisma.service';

@Module({
  controllers: [AgencyController],
  providers: [AgencyService, WahaWatchdogService, PrismaService],
  exports: [AgencyService, WahaWatchdogService],
})
export class AgencyModule {}
