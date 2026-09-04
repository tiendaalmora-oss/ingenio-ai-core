import { EventEmitter2 } from '@nestjs/event-emitter';
import { ContextBuilderService } from './context-builder.service';
import { HermesClientService } from './hermes-client.service';
import { InteractionReceivedEvent } from '../../conversation';
import { PrismaService } from '../../../shared/database/prisma.service';
import { FunnelEngineService } from '../../funnel-engine/funnel-engine.service';
import { RuntimeEngineService } from '../../funnel-engine/runtime/runtime-engine.service';
export declare class LlmListenerService {
    private readonly contextBuilder;
    private readonly hermesClient;
    private readonly eventEmitter;
    private readonly prisma;
    private readonly funnelEngine;
    private readonly runtimeEngine;
    private readonly logger;
    private readonly loopDepths;
    private readonly MAX_LOOP_DEPTH;
    private readonly LOOP_RESET_MS;
    constructor(contextBuilder: ContextBuilderService, hermesClient: HermesClientService, eventEmitter: EventEmitter2, prisma: PrismaService, funnelEngine: FunnelEngineService, runtimeEngine: RuntimeEngineService);
    handleInteraction(payload: InteractionReceivedEvent): Promise<void>;
    private canEnterLoop;
    private incrementDepth;
    private decrementDepth;
    private pruneStaleEntries;
    getLoopDepth(conversationId: string): number;
}
