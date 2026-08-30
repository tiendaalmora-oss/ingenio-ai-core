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
import { sanitizeUserFacingResponse } from '../utils/response-sanitizer';

/**
 * Tracks the recursive depth of the Executive Loop per conversation.
 * Used by the Circuit Breaker to prevent infinite tool-call loops.
 */
interface LoopState {
  /** Current nesting depth. Increments on each re-emitted interaction.received. */
  depth: number;
  /**
   * Unix ms timestamp after which this entry is considered stale and resets.
   * Prevents a conversation from being permanently blocked after a transient bug.
   */
  resetAt: number;
}

@Injectable()
export class LlmListenerService {
  private readonly logger = new Logger(LlmListenerService.name);

  // ── Circuit Breaker ───────────────────────────────────────────────────────────

  /**
   * In-memory map tracking the Executive Loop depth per conversation.
   *
   * Key:   conversationId (UUID string)
   * Value: LoopState { depth, resetAt }
   *
   * Phase 1: In-memory Map (zero-latency, sufficient for single-instance).
   * Phase 2: Replace with a Redis-backed LoopDepthService (no changes to callers).
   */
  private readonly loopDepths = new Map<string, LoopState>();

  /**
   * Maximum consecutive re-entries per conversation before the loop is aborted.
   *
   * Flow that hits the limit:
   *   User msg → Hermes → tool.called → interaction.received (depth 1)
   *            → Hermes → tool.called → interaction.received (depth 2) → ...
   *            → depth 5 → ABORT
   */
  private readonly MAX_LOOP_DEPTH = 5;

  /**
   * After this many milliseconds of inactivity, the depth counter resets to 0.
   * Prevents a conversation from being permanently throttled after a bug.
   */
  private readonly LOOP_RESET_MS = 30_000; // 30 seconds

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

    // ── Circuit Breaker Check ─────────────────────────────────────────────────
    if (!this.canEnterLoop(payload.conversationId)) {
      this.logger.warn(
        `[CircuitBreaker] ABORT — Executive Loop depth exceeded MAX_LOOP_DEPTH (${this.MAX_LOOP_DEPTH}) ` +
        `for conversation ${payload.conversationId}. ` +
        `Dropping interaction to prevent infinite recursion.`,
      );
      return;
    }

    // ── Check if conversation is paused / handed off to human ────────────────
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: payload.conversationId },
    });

    if (conversation && (conversation.status === 'HANDOFF' || conversation.status === 'PAUSED' || conversation.status === 'LOST' || conversation.status === 'RESOLVED')) {
      this.logger.log(`[Executive Loop] Conversación ${payload.conversationId} en estado '${conversation.status}'. Bot en pausa para permitir atención humana manual.`);
      return;
    }

    // ── Check Configurable Bot Control Rules (Opt-Out, Human Handoff & Message Limit) ──
    const bundle = this.prisma?.knowledgeBundle
      ? await this.prisma.knowledgeBundle.findUnique({
          where: { tenantId: payload.tenantId },
        })
      : null;
    const rawPrompt: any = bundle?.systemPrompt || {};
    const rawData = rawPrompt['_raw'] || rawPrompt;
    const reglasBot = rawData.reglasBot || {
      autoPauseOptOut: true,
      optOutMessage: 'Entendido perfectamente. Agradecemos mucho tu tiempo y honestidad. ¡Que tengas un excelente día!',
      autoPauseHandoff: true,
      handoffMessage: 'Con gusto. En breve un asesor humano de nuestro equipo continuará la conversación contigo por acá.',
      enableMessageLimit: true,
      maxBotMessages: 10,
      limitReachedMessage: 'Para brindarte una atención personalizada y revisar los detalles de tu caso, te transferiré con un asesor de nuestro equipo que te atenderá en breve.'
    };

    const textNorm = (payload.content || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    // 1. REGLA: Auto-Pausa por Rechazo / Desinterés (Opt-Out)
    if (reglasBot.autoPauseOptOut !== false) {
      const optOutPatterns = [
        'no me interesa',
        'no estoy interesado',
        'no estoy interesada',
        'no gracias',
        'no me escribas mas',
        'no me escriban mas',
        'no me escribas',
        'no me escriban',
        'no quiero nada',
        'no quiero recibir',
        'deja de escribir',
        'dejen de escribir',
        'cancela',
        'cancelar',
        'eliminarme',
        'darme de baja',
        'ya no quiero',
        'no molesten',
        'no molestar',
        'no enviar mas',
        'no me mandes mas',
        'no me manden mas',
        'desuscribir',
        'no responder mas'
      ];

      const isOptOut = optOutPatterns.some(p => textNorm.includes(p));
      if (isOptOut) {
        this.logger.log(`[Reglas Bot] Detectado Opt-Out ("${payload.content}"). Pausando bot permanentemente y cancelando seguimientos.`);
        
        await this.prisma.conversation.update({
          where: { id: payload.conversationId },
          data: { status: 'LOST' }
        });

        const memory = await this.prisma.businessMemory.findUnique({ where: { contactId: payload.contactId } });
        const currentTags = (memory?.tags as string[]) || [];
        const updatedTags = Array.from(new Set([...currentTags, 'NO_INTERESADO', 'OPT_OUT']));
        await this.prisma.businessMemory.upsert({
          where: { contactId: payload.contactId },
          create: {
            contactId: payload.contactId,
            leadStatus: 'LOST',
            tags: updatedTags
          },
          update: {
            leadStatus: 'LOST',
            tags: updatedTags
          }
        });

        await this.prisma.pendingOutboundMessage.deleteMany({
          where: { conversationId: payload.conversationId }
        });

        const farewell = reglasBot.optOutMessage || 'Entendido perfectamente. Agradecemos mucho tu tiempo y honestidad. ¡Que tengas un excelente día!';
        
        await this.prisma.interaction.create({
          data: {
            conversationId: payload.conversationId,
            direction: 'OUTBOUND',
            type: 'TEXT',
            content: farewell,
            role: 'assistant'
          }
        });

        this.eventEmitter.emit('response.generated', new ResponseGeneratedEvent(
          payload.tenantId,
          payload.conversationId,
          farewell
        ));
        return;
      }
    }

    // 2. REGLA: Auto-Pausa y Traspaso por Solicitud de Humano (Handoff)
    if (reglasBot.autoPauseHandoff !== false) {
      const handoffPatterns = [
        'hablar con un humano',
        'hablar con una persona',
        'persona real',
        'un asesor',
        'asesor humano',
        'atencion humana',
        'atencion con persona',
        'pasame con un asesor',
        'pasame con alguien',
        'quiero una persona',
        'quiero un asesor',
        'quiero un humano',
        'comunicarme con una persona',
        'comunicarme con un asesor',
        'asesor por favor',
        'humano por favor'
      ];

      const isHandoff = handoffPatterns.some(p => textNorm.includes(p));
      if (isHandoff) {
        this.logger.log(`[Reglas Bot] Solicitud de asesor humano ("${payload.content}"). Traspasando a HANDOFF y cancelando seguimientos.`);
        
        await this.prisma.conversation.update({
          where: { id: payload.conversationId },
          data: { status: 'HANDOFF' }
        });

        const memory = await this.prisma.businessMemory.findUnique({ where: { contactId: payload.contactId } });
        const currentTags = (memory?.tags as string[]) || [];
        const updatedTags = Array.from(new Set([...currentTags, 'HANDOFF_HUMANO', 'ASESOR_SOLICITADO']));
        await this.prisma.businessMemory.upsert({
          where: { contactId: payload.contactId },
          create: {
            contactId: payload.contactId,
            leadStatus: 'HANDOFF',
            tags: updatedTags
          },
          update: {
            leadStatus: 'HANDOFF',
            tags: updatedTags
          }
        });

        await this.prisma.pendingOutboundMessage.deleteMany({
          where: { conversationId: payload.conversationId }
        });

        const handoffMsg = reglasBot.handoffMessage || 'Con gusto. En breve un asesor humano de nuestro equipo continuará la conversación contigo por acá.';
        
        await this.prisma.interaction.create({
          data: {
            conversationId: payload.conversationId,
            direction: 'OUTBOUND',
            type: 'TEXT',
            content: handoffMsg,
            role: 'assistant'
          }
        });

        this.eventEmitter.emit('response.generated', new ResponseGeneratedEvent(
          payload.tenantId,
          payload.conversationId,
          handoffMsg
        ));
        return;
      }
    }

    // 3. REGLA: Límite Máximo de Mensajes del Bot (Ahorro de Tokens y Guardrail)
    if (reglasBot.enableMessageLimit !== false) {
      const maxMessages = Number(reglasBot.maxBotMessages) || 10;
      const botMessageCount = this.prisma?.interaction?.count
        ? await this.prisma.interaction.count({
            where: {
              conversationId: payload.conversationId,
              direction: 'OUTBOUND',
              role: 'assistant'
            }
          })
        : 0;

      if (botMessageCount >= maxMessages) {
        this.logger.log(`[Reglas Bot] Conversación ${payload.conversationId} alcanzó el límite de ${maxMessages} mensajes del bot (${botMessageCount} enviados). Pausando bot.`);
        
        await this.prisma.conversation.update({
          where: { id: payload.conversationId },
          data: { status: 'HANDOFF' }
        });

        await this.prisma.pendingOutboundMessage.deleteMany({
          where: { conversationId: payload.conversationId }
        });

        const limitMsg = reglasBot.limitReachedMessage || 'Para brindarte una atención personalizada y revisar los detalles de tu caso, te transferiré con un asesor de nuestro equipo que te atenderá en breve.';
        
        await this.prisma.interaction.create({
          data: {
            conversationId: payload.conversationId,
            direction: 'OUTBOUND',
            type: 'TEXT',
            content: limitMsg,
            role: 'assistant'
          }
        });

        this.eventEmitter.emit('response.generated', new ResponseGeneratedEvent(
          payload.tenantId,
          payload.conversationId,
          limitMsg
        ));
        return;
      }
    }

    this.incrementDepth(payload.conversationId);

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

      let finalContent = '';
      const response = await this.hermesClient.generateResponse(masterPrompt, true);

      // Si el LLM ejecutó herramientas
      if (response.toolCalls && response.toolCalls.length > 0) {
        await this.prisma.interaction.create({
          data: {
            conversationId: payload.conversationId,
            direction: 'OUTBOUND',
            type: 'TOOL_CALL',
            content: response.content || '',
            role: 'assistant',
            toolCalls: response.toolCalls
          }
        });

        for (const call of response.toolCalls) {
          await this.eventEmitter.emitAsync('tool.called', new ToolCalledEvent(
            payload.tenantId,
            payload.conversationId,
            payload.contactId,
            call.id,
            call.name,
            call.arguments
          ));
        }

        if (response.content && response.content.trim() !== '') {
          finalContent = response.content;
        } else {
          // Solicitamos la respuesta conversacional final forzando texto (enableTools = false con toolChoice = 'none')
          this.logger.log(`[Executive Loop] Herramienta ejecutada. Solicitando respuesta de texto conversacional para el usuario...`);
          const textPrompt = await this.contextBuilder.buildContext(
            payload.tenantId,
            payload.contactId,
            payload.conversationId,
            payload.content,
            null
          );

          // Directiva explícita para que el LLM redacte la respuesta sin demoras
          textPrompt.push({
            role: 'user',
            content: `[SISTEMA]: La memoria del CRM ya fue actualizada con éxito. Redacta ahora tu respuesta conversacional completa para el usuario respondiendo a su mensaje: "${payload.content}". Sé persuasivo, amable y termina con una pregunta de cierre.`
          });

          const textResponse = await this.hermesClient.generateResponse(textPrompt, false);
          if (textResponse.content) {
            finalContent = textResponse.content;
          }
        }
      } else if (response.content) {
        finalContent = response.content;
      }

      // Fallback de seguridad: Si la IA no generó texto tras la herramienta, generar respuesta contextual
      if (!finalContent || finalContent.trim() === '') {
        this.logger.warn(`[Executive Loop] LLM devolvió texto vacío tras herramienta. Generando respuesta contextual de contingencia...`);
        const userMsg = (payload.content || '').toLowerCase();
        if (userMsg.includes('matemática') || userMsg.includes('matematica')) {
          finalContent = '¡Excelente, profe! Justamente para Matemática de bachillerato tenemos nuestro Mega Kit con planificaciones listas, evaluaciones resueltas y guías pedagógicas. ¿Qué años estás atendiendo actualmente (de 1° a 5° año) para orientarte mejor? 😊📐';
        } else if (userMsg.includes('física') || userMsg.includes('fisica')) {
          finalContent = '¡Excelente, profe! Para Física de bachillerato contamos con el Mega Kit completo de física. ¿Qué años estás atendiendo (de 3° a 5° año)? 😊⚡';
        } else if (userMsg.includes('comprobante') || userMsg.includes('pago') || userMsg.includes('referencia')) {
          finalContent = '¡Muchísimas gracias, profe! Hemos registrado tu comprobante con éxito. Ya estamos preparando los accesos para que puedas descargar todo el material de inmediato. 🎉🎒';
        } else {
          finalContent = '¡Hola, profe! Qué gusto saludarte. 👋 Cuéntame, ¿de qué materia o año estás buscando material para orientarte con la mejor opción? 📚';
        }
      }

      if (finalContent) {
        finalContent = sanitizeUserFacingResponse(finalContent);
      }

      if (finalContent && finalContent.trim() !== '') {
        await this.prisma.interaction.create({
          data: {
            conversationId: payload.conversationId,
            direction: 'OUTBOUND',
            type: 'TEXT',
            content: finalContent,
            role: 'assistant'
          }
        });

        this.eventEmitter.emit('response.generated', new ResponseGeneratedEvent(
          payload.tenantId,
          payload.conversationId,
          finalContent
        ));
      }
    } catch (error) {
      this.logger.error(`Error orquestando LLM:`, error);
    } finally {
      // Always decrement depth — even on error — to avoid permanently blocking a conversation.
      this.decrementDepth(payload.conversationId);
    }
  }

  // ── Circuit Breaker Internals ─────────────────────────────────────────────────

  /**
   * Returns true if the conversation is allowed to enter the Executive Loop.
   * Stale entries (past their resetAt) are pruned before checking.
   */
  private canEnterLoop(conversationId: string): boolean {
    this.pruneStaleEntries();
    const state = this.loopDepths.get(conversationId);
    if (!state) return true; // No entry → depth is 0 → allowed.
    return state.depth < this.MAX_LOOP_DEPTH;
  }

  /** Increments the loop depth and refreshes the resetAt timer. */
  private incrementDepth(conversationId: string): void {
    const existing = this.loopDepths.get(conversationId);
    const newDepth = (existing?.depth ?? 0) + 1;
    this.loopDepths.set(conversationId, {
      depth: newDepth,
      resetAt: Date.now() + this.LOOP_RESET_MS,
    });
    this.logger.debug(`[CircuitBreaker] Conv ${conversationId}: depth → ${newDepth}`);
  }

  /** Decrements the loop depth. Removes entry when depth reaches 0. */
  private decrementDepth(conversationId: string): void {
    const state = this.loopDepths.get(conversationId);
    if (!state) return;

    const newDepth = state.depth - 1;
    if (newDepth <= 0) {
      this.loopDepths.delete(conversationId);
    } else {
      this.loopDepths.set(conversationId, { ...state, depth: newDepth });
    }
    this.logger.debug(`[CircuitBreaker] Conv ${conversationId}: depth → ${Math.max(0, newDepth)}`);
  }

  /**
   * Lazy cleanup: removes entries whose resetAt has expired.
   * Called before each canEnterLoop check. Avoids a background interval timer.
   */
  private pruneStaleEntries(): void {
    const now = Date.now();
    for (const [id, state] of this.loopDepths.entries()) {
      if (state.resetAt <= now) {
        this.loopDepths.delete(id);
        this.logger.debug(`[CircuitBreaker] Pruned stale entry for conv ${id}`);
      }
    }
  }

  /**
   * Returns the current loop depth for a conversation.
   * @internal — Exposed for testing only.
   */
  getLoopDepth(conversationId: string): number {
    return this.loopDepths.get(conversationId)?.depth ?? 0;
  }
}
