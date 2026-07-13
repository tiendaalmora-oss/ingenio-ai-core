import { Module } from '@nestjs/common';
import { FunnelEngineService } from './funnel-engine.service';
import { DatabaseModule } from '../../shared/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [FunnelEngineService],
  exports: [FunnelEngineService]
})
export class FunnelEngineModule {}
