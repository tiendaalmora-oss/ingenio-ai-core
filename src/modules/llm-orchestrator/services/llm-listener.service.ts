import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ContextBuilderService } from './context-builder.service';
import { HermesClientService } from './hermes-client.service';
import { InteractionReceivedEvent } from '../../conversation';
import { ResponseGeneratedEvent } from '../events/out/response-generated.event';
import { ToolCalledEvent } from '../events/out/tool-called.event';
import { PrismaService } from '../../../shared/database/prisma.service';
import { FunnelEngineService } from '../../funnel-engine/funnel-engine.service';
import { RuntimeEngineService } from '../../funnel-engine/runtime/runtime-engine.service';
import { ExecutionContext } from '../../funnel-engine/runtime/execution-context.interface';

@Injectable()
export class LlmListenerService {
  private readonly logger = new Logger(LlmListenerService.name);

  constructor(
    private readonly contextBuilder: ContextBuilderService,
    private readonly hermesClient: HermesClientService,
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
    private readonly funnelEngine: FunnelEngineService,
    private readonly runtimeEngine: RuntimeEngineService
  ) {}

  @OnEvent('interaction.received', { async: true })
  async handleInteraction(payload: InteractionReceivedEvent) {
    this.logger.log(`Executive Loop atrapó interacción entrante (Conv: ${payload.conversationId})`);
    
    try {
      // 1. Buscar si hay una automatización que coincida
      const funnel = await this.funnelEngine.findMatchingFunnel(payload);

      if (funnel) {
        this.logger.log(`Ejecutando Automation Runtime para el funnel: ${funnel.name}`);
        const dsl = this.runtimeEngine.parseReactFlowToDsl(funnel.steps);
        
        const context: ExecutionContext = {
          tenantId: payload.tenantId,
          sessionId: payload.conversationId,
          triggerEvent: payload,
          state: {},
          logs: []
        };
        
        await this.runtimeEngine.executeFlow(dsl, context);
        return; // Detenemos aquí, el Runtime se encarga del resto
      }

      // 2. Si no hay funnel, el Agente Universal actúa libremente
      this.logger.log(`No hay automatización, ejecutando Agente Universal...`);
      const masterPrompt = await this.contextBuilder.buildContext(
        payload.tenantId, 
        payload.contactId, 
        payload.conversationId,
        payload.content,
        null
      );

      const response = await this.hermesClient.generateResponse(masterPrompt);

      if (response.content) {
        await this.prisma.interaction.create({
          data: {
            conversationId: payload.conversationId,
            direction: 'OUTBOUND',
            type: 'TEXT',
            content: response.content,
            role: 'assistant'
          }
        });

        this.eventEmitter.emit('response.generated', new ResponseGeneratedEvent(
          payload.tenantId,
          payload.conversationId,
          response.content
        ));
      }

      if (response.toolCalls && response.toolCalls.length > 0) {
        await this.prisma.interaction.create({
          data: {
            conversationId: payload.conversationId,
            direction: 'OUTBOUND',
            type: 'TOOL_CALL',
            content: '', // Empty string in DB — ContextBuilder sends null to LLM
            role: 'assistant',
            toolCalls: response.toolCalls
          }
        });

        for (const call of response.toolCalls) {
          this.eventEmitter.emit('tool.called', new ToolCalledEvent(
            payload.tenantId,
            payload.conversationId,
            payload.contactId,
            call.id,
            call.name,
            call.arguments
          ));
        }
      }
    } catch (error) {
      this.logger.error(`Error orquestando LLM:`, error);
    }
  }
}
