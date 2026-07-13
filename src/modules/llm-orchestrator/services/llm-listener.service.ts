import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ContextBuilderService } from './context-builder.service';
import { HermesClientService } from './hermes-client.service';
import { InteractionReceivedEvent } from '../../conversation';
import { ResponseGeneratedEvent } from '../events/out/response-generated.event';
import { ToolCalledEvent } from '../events/out/tool-called.event';

@Injectable()
export class LlmListenerService {
  private readonly logger = new Logger(LlmListenerService.name);

  constructor(
    private readonly contextBuilder: ContextBuilderService,
    private readonly hermesClient: HermesClientService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent('interaction.received', { async: true })
  async handleInteraction(payload: InteractionReceivedEvent) {
    this.logger.log(`LLM Orchestrator atrapó interacción entrante (Conv: ${payload.conversationId})`);
    
    try {
      // 1. Context Builder
      const masterPrompt = await this.contextBuilder.buildContext(
        payload.tenantId, 
        payload.contactId, 
        payload.conversationId,
        payload.content
      );

      // 2. Llamar a Hermes
      const response = await this.hermesClient.generateResponse(masterPrompt);

      // 3. Emitir eventos
      // Si el LLM devolvió texto, generamos respuesta al usuario
      if (response.content) {
        const outEvent = new ResponseGeneratedEvent(
          payload.tenantId,
          payload.conversationId,
          response.content
        );
        this.eventEmitter.emit('response.generated', outEvent);
        this.logger.log(`Evento response.generated despachado al Event Bus.`);
      }

      // Si el LLM devolvió tool calls, activamos el Skill Engine
      if (response.toolCalls && response.toolCalls.length > 0) {
        for (const call of response.toolCalls) {
          const toolEvent = new ToolCalledEvent(
            payload.tenantId,
            payload.conversationId,
            payload.contactId,
            call.name,
            call.arguments
          );
          this.eventEmitter.emit('tool.called', toolEvent);
          this.logger.log(`Evento tool.called despachado para la tool: ${call.name}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error orquestando LLM:`, error);
    }
  }
}
