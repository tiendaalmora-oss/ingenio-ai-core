import { Module } from '@nestjs/common';
import { LlmListenerService } from './services/llm-listener.service';
import { ContextBuilderService } from './services/context-builder.service';
import { HermesClientService } from './services/hermes-client.service';
import { KosLoaderService } from './services/kos-loader.service';
import { DatabaseModule } from '../../shared/database/database.module';
import { FunnelEngineModule } from '../funnel-engine/funnel-engine.module';
import { AiProviderFactory, AI_PROVIDER_TOKEN } from './providers/ai-provider.factory';

@Module({
  imports: [DatabaseModule, FunnelEngineModule],
  providers: [
    // AI Provider — reads AI_PROVIDER env var at startup and injects the correct adapter
    AiProviderFactory,
    {
      provide: AI_PROVIDER_TOKEN,
      useFactory: (factory: AiProviderFactory) => factory.create(),
      inject: [AiProviderFactory],
    },
    LlmListenerService,
    ContextBuilderService,
    HermesClientService,
    KosLoaderService,
  ],
})
export class LlmOrchestratorModule {}

