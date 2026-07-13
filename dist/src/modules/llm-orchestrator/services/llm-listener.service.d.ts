import { EventEmitter2 } from '@nestjs/event-emitter';
import { ContextBuilderService } from './context-builder.service';
import { HermesClientService } from './hermes-client.service';
import { InteractionReceivedEvent } from '../../conversation';
import { PrismaService } from '../../../shared/database/prisma.service';
import { FunnelEngineService } from '../../funnel-engine/funnel-engine.service';
export declare class LlmListenerService {
    private readonly contextBuilder;
    private readonly hermesClient;
    private readonly eventEmitter;
    private readonly prisma;
    private readonly funnelEngine;
    private readonly logger;
    constructor(contextBuilder: ContextBuilderService, hermesClient: HermesClientService, eventEmitter: EventEmitter2, prisma: PrismaService, funnelEngine: FunnelEngineService);
    handleInteraction(payload: InteractionReceivedEvent): Promise<void>;
}
