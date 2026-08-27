import { Module } from '@nestjs/common';
import { FollowUpEngineService } from './services/follow-up-engine.service';
import { FollowUpListenerService } from './listeners/follow-up.listener';
import { FollowUpDebugController } from './follow-up-debug.controller';
import { DatabaseModule } from '../../shared/database/database.module';
import { LlmOrchestratorModule } from '../llm-orchestrator/llm-orchestrator.module';
import { OutboundEngineModule } from '../outbound-engine/outbound-engine.module';

@Module({
  imports: [DatabaseModule, LlmOrchestratorModule, OutboundEngineModule],
  controllers: [FollowUpDebugController],
  providers: [FollowUpEngineService, FollowUpListenerService],
  exports: [FollowUpEngineService],
})
export class FollowUpEngineModule {}
