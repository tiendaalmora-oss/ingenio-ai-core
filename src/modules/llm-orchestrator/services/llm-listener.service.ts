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
          // Solicitamos la respuesta conversacional final forzando texto (enableTools = false)
          this.logger.log(`[Executive Loop] Herramienta ejecutada. Solicitando respuesta de texto conversacional para el usuario...`);
          const textPrompt = await this.contextBuilder.buildContext(
            payload.tenantId,
            payload.contactId,
            payload.conversationId,
            null,
            null
          );
          const textResponse = await this.hermesClient.generateResponse(textPrompt, false);
          if (textResponse.content) {
            finalContent = textResponse.content;
          }
        }
      } else if (response.content) {
        finalContent = response.content;
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
