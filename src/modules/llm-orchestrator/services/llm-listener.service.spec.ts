import { Test, TestingModule } from '@nestjs/testing';
import { LlmListenerService } from './llm-listener.service';
import { ContextBuilderService } from './context-builder.service';
import { HermesClientService } from './hermes-client.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../shared/database/prisma.service';
import { FunnelEngineService } from '../../funnel-engine/funnel-engine.service';
import { RuntimeEngineService } from '../../funnel-engine/runtime/runtime-engine.service';

/**
 * LlmListenerService — Unit Tests
 *
 * Focuses on Circuit Breaker behavior. All dependencies are mocked.
 * DB, EventEmitter2, and Hermes are never called for real.
 */
describe('LlmListenerService', () => {
  let service: LlmListenerService;
  let hermesClient: jest.Mocked<HermesClientService>;
  let funnelEngine: jest.Mocked<FunnelEngineService>;
  let runtimeEngine: jest.Mocked<RuntimeEngineService>;
  let contextBuilder: jest.Mocked<ContextBuilderService>;
  let prisma: jest.Mocked<PrismaService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  // ── Fixtures ─────────────────────────────────────────────────────────────────

  const PAYLOAD = {
    tenantId: 'tenant-1',
    conversationId: 'conv-abc',
    contactId: 'contact-1',
    content: 'Hola',
    eventId: 'evt-1',
    eventName: 'interaction.received',
    payload: {},
  } as any;

  // ── Setup ────────────────────────────────────────────────────────────────────

  beforeEach(async () => {
    hermesClient = { generateResponse: jest.fn() } as any;
    funnelEngine = { findMatchingFunnel: jest.fn().mockResolvedValue(null) } as any;
    runtimeEngine = { parseReactFlowToDsl: jest.fn(), executeFlow: jest.fn() } as any;
    contextBuilder = { buildContext: jest.fn().mockResolvedValue('mock-prompt') } as any;
    prisma = {
      interaction: { create: jest.fn().mockResolvedValue({}) },
      conversation: { findUnique: jest.fn().mockResolvedValue({ id: 'conv-abc', status: 'ACTIVE' }) },
    } as any;
    eventEmitter = { emit: jest.fn(), emitAsync: jest.fn().mockResolvedValue([]) } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmListenerService,
        { provide: ContextBuilderService, useValue: contextBuilder },
        { provide: HermesClientService, useValue: hermesClient },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: PrismaService, useValue: prisma },
        { provide: FunnelEngineService, useValue: funnelEngine },
        { provide: RuntimeEngineService, useValue: runtimeEngine },
      ],
    }).compile();

    service = module.get<LlmListenerService>(LlmListenerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── Tests ────────────────────────────────────────────────────────────────────

  describe('Normal operation (depth = 0)', () => {
    it('should generate a response and emit response.generated when no tools are called', async () => {
      hermesClient.generateResponse.mockResolvedValue({
        content: '¡Hola! ¿Cómo estás?',
        toolCalls: [],
      });

      await service.handleInteraction(PAYLOAD);

      expect(hermesClient.generateResponse).toHaveBeenCalledTimes(1);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'response.generated',
        expect.objectContaining({
          conversationId: 'conv-abc',
          generatedContent: '¡Hola! ¿Cómo estás?',
        }),
      );
    });

    it('should emit tool.called events for each tool call returned by Hermes', async () => {
      hermesClient.generateResponse
        .mockResolvedValueOnce({
          content: undefined,
          toolCalls: [
            { id: 'call-1', name: 'update_business_memory', arguments: { key: 'nombre', value: 'Juan' } },
            { id: 'call-2', name: 'create_task', arguments: { title: 'Seguimiento' } },
          ],
        })
        .mockResolvedValueOnce({
          content: 'He actualizado tu información.',
          toolCalls: [],
        });

      await service.handleInteraction(PAYLOAD);

      expect(eventEmitter.emitAsync).toHaveBeenCalledTimes(2);
      expect(eventEmitter.emitAsync).toHaveBeenCalledWith('tool.called', expect.objectContaining({ toolName: 'update_business_memory' }));
      expect(eventEmitter.emitAsync).toHaveBeenCalledWith('tool.called', expect.objectContaining({ toolName: 'create_task' }));
    });

    it('should execute the Automation Runtime when a matching funnel is found', async () => {
      const mockFunnel = { name: 'Bienvenida', steps: [] };
      funnelEngine.findMatchingFunnel.mockResolvedValue(mockFunnel as any);
      runtimeEngine.parseReactFlowToDsl.mockReturnValue({ steps: [] });
      runtimeEngine.executeFlow.mockResolvedValue(undefined);

      await service.handleInteraction(PAYLOAD);

      expect(runtimeEngine.executeFlow).toHaveBeenCalledTimes(1);
      expect(hermesClient.generateResponse).not.toHaveBeenCalled(); // Short-circuited by funnel
    });
  });

  // ── Circuit Breaker ──────────────────────────────────────────────────────────

  describe('Circuit Breaker', () => {
    it('should start with loop depth 0 for any conversation', () => {
      expect(service.getLoopDepth('conv-abc')).toBe(0);
    });

    it('should increment loop depth while processing and decrement after completion', async () => {
      // Use a slow Hermes to observe depth during execution
      let depthDuringExecution = -1;

      hermesClient.generateResponse.mockImplementation(async () => {
        depthDuringExecution = service.getLoopDepth(PAYLOAD.conversationId);
        return { content: 'ok', toolCalls: [] };
      });

      await service.handleInteraction(PAYLOAD);

      expect(depthDuringExecution).toBe(1); // Depth is 1 while processing
      expect(service.getLoopDepth(PAYLOAD.conversationId)).toBe(0); // Reset after finally
    });

    it('should abort processing (not call hermesClient) when depth >= MAX_LOOP_DEPTH', async () => {
      // Manually saturate the loop by accessing private field
      const MAX = 5;
      (service as any).loopDepths.set(PAYLOAD.conversationId, {
        depth: MAX,
        resetAt: Date.now() + 30_000,
      });

      await service.handleInteraction(PAYLOAD);

      expect(hermesClient.generateResponse).not.toHaveBeenCalled();
      expect(funnelEngine.findMatchingFunnel).not.toHaveBeenCalled();
    });

    it('should allow processing again after stale entry is pruned (LOOP_RESET_MS elapsed)', async () => {
      hermesClient.generateResponse.mockResolvedValue({ content: 'ok', toolCalls: [] });

      // Manually inject a stale entry (resetAt in the past)
      (service as any).loopDepths.set(PAYLOAD.conversationId, {
        depth: 5,
        resetAt: Date.now() - 1, // Already expired
      });

      await service.handleInteraction(PAYLOAD);

      // Pruning should have removed the stale entry → loop was allowed
      expect(hermesClient.generateResponse).toHaveBeenCalledTimes(1);
    });

    it('should decrement depth even when Hermes throws an error (finally block)', async () => {
      hermesClient.generateResponse.mockRejectedValue(new Error('LLM timeout'));

      await service.handleInteraction(PAYLOAD); // Should not throw — caught internally

      expect(service.getLoopDepth(PAYLOAD.conversationId)).toBe(0); // Depth reset via finally
    });

    it('should track depths independently per conversationId', async () => {
      const MAX = 5;
      (service as any).loopDepths.set('conv-blocked', {
        depth: MAX,
        resetAt: Date.now() + 30_000,
      });

      hermesClient.generateResponse.mockResolvedValue({ content: 'ok', toolCalls: [] });

      // conv-blocked should be aborted
      await service.handleInteraction({ ...PAYLOAD, conversationId: 'conv-blocked' });
      // conv-free should proceed normally
      await service.handleInteraction({ ...PAYLOAD, conversationId: 'conv-free' });

      expect(hermesClient.generateResponse).toHaveBeenCalledTimes(1); // Only conv-free called Hermes
    });
  });
});
