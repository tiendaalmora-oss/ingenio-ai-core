import { Module } from '@nestjs/common';
import { ContextBuilderService } from './services/context-builder.service';
import { HermesClientService } from './services/hermes-client.service';
import { LlmListenerService } from './services/llm-listener.service';

@Module({
  imports: [],
  providers: [ContextBuilderService, HermesClientService, LlmListenerService],
  exports: [],
})
export class LlmOrchestratorModule {}
