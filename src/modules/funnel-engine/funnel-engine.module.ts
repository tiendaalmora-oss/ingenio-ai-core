import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { FunnelEngineService } from './funnel-engine.service';
import { FunnelController } from './funnel.controller';
import { FunnelGeneratorService } from './funnel-generator.service';
import { AutomationCompilerService } from './automation-compiler.service';
import { DatabaseModule } from '../../shared/database/database.module';

// Runtime
import { RuntimeEngineService } from './runtime/runtime-engine.service';
import { NodeExecutorService } from './runtime/node-executor.service';
import { RuntimeLoggerService } from './runtime/runtime-logger.service';

@Module({
  imports: [DatabaseModule, EventEmitterModule.forRoot()],
  controllers: [FunnelController],
  providers: [
    FunnelEngineService, 
    FunnelGeneratorService, 
    AutomationCompilerService,
    RuntimeEngineService,
    NodeExecutorService,
    RuntimeLoggerService
  ],
  exports: [FunnelEngineService, RuntimeEngineService]
})
export class FunnelEngineModule {}
