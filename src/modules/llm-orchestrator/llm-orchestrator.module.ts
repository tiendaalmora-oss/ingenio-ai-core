import { Module } from '@nestjs/common';
import { LlmListenerService } from './services/llm-listener.service';
import { ContextBuilderService } from './services/context-builder.service';
import { HermesClientService } from './services/hermes-client.service';
import { KosLoaderService } from './services/kos-loader.service';
import { DatabaseModule } from '../../shared/database/database.module';
import { FunnelEngineModule } from '../funnel-engine/funnel-engine.module';

@Module({
  imports: [DatabaseModule, FunnelEngineModule],
  providers: [
    LlmListenerService,
    ContextBuilderService,
    HermesClientService,
    KosLoaderService
  ]
})
export class LlmOrchestratorModule {}
