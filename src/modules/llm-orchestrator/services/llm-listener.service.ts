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

@Injectable()
export class LlmListenerService {
  private readonly logger = new Logger(LlmListenerService.name);

  constructor(
    private readonly contextBuilder: ContextBuilderService,
    private readonly hermesClient: HermesClientService,
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
    private readonly funnelEngine: FunnelEngineService,
  ) {}

  @OnEvent('interaction.received', { async: true })
  async handleInteraction(payload: InteractionReceivedEvent) {
    this.logger.log(`LLM Orchestrator atrapó interacción entrante (Conv: ${payload.conversationId})`);
    
    try {
      // 0. ¿Existe un Funnel para esta conversación o mensaje?
      const funnelInstruction = await this.funnelEngine.evaluateInteraction(payload);

      // 1. Context Builder (Agente Universal + Instrucciones de Funnel si existen)
      const masterPrompt = await this.contextBuilder.buildContext(
        payload.tenantId, 
        payload.contactId, 
        payload.conversationId,
        payload.content,
        funnelInstruction
      );

      // 2. Llamar a Hermes
      const response = await this.hermesClient.generateResponse(masterPrompt);

      // 3. Emitir eventos
      // Si el LLM devolvió texto, generamos respuesta al usuario
      if (response.content) {
        // Guardar la respuesta del assistant en la DB (Texto puro)
        await this.prisma.interaction.create({
          data: {
            conversationId: payload.conversationId,
            direction: 'OUTBOUND',
            type: 'TEXT',
            content: response.content,
            role: 'assistant'
          }
        });

        const outEvent = new ResponseGeneratedEvent(
          payload.tenantId,
          payload.conversationId,
          response.content
        );
        this.eventEmitter.emit('response.generated', outEvent);
        this.logger.log(`Evento response.generated despachado al Event Bus.`);
      }

      // Si el LLM devolvió tool calls, los guardamos en la DB y activamos el Skill Engine
      if (response.toolCalls && response.toolCalls.length > 0) {
        // Guardar el assistant tool call en la DB
        await this.prisma.interaction.create({
          data: {
            conversationId: payload.conversationId,
            direction: 'OUTBOUND',
            type: 'TOOL_CALL',
            content: '',
            role: 'assistant',
            toolCalls: response.toolCalls
          }
        });

        for (const call of response.toolCalls) {
          const toolEvent = new ToolCalledEvent(
            payload.tenantId,
            payload.conversationId,
            payload.contactId,
            call.id,
            call.name,
            call.arguments
          );
          // Podemos extender ToolCalledEvent para pasar el tool_call_id real si la API lo expone,
          // pero por simplicidad de este MVP, lo pasaremos si lo tenemos. Aquí asumo que la API lo mapea.
          // Como HermesClientService formatea a `name` y `arguments`, agregaremos `id` temporalmente si existiera.
          // Por ahora, asumiremos que el ID se pasa, o generaremos uno localmente.
          this.eventEmitter.emit('tool.called', toolEvent);
          this.logger.log(`Evento tool.called despachado para la tool: ${call.name}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error orquestando LLM:`, error);
    }
  }
}
