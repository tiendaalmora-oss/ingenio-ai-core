import { Module } from '@nestjs/common';
import { FollowUpEngineService } from './services/follow-up-engine.service';
import { FollowUpListenerService } from './listeners/follow-up.listener';
import { DatabaseModule } from '../../shared/database/database.module';
import { LlmOrchestratorModule } from '../llm-orchestrator/llm-orchestrator.module';

@Module({
  imports: [DatabaseModule, LlmOrchestratorModule],
  providers: [FollowUpEngineService, FollowUpListenerService],
})
export class FollowUpEngineModule {}
