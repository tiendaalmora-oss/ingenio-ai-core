import { EventEmitter2 } from '@nestjs/event-emitter';
import { ContextBuilderService } from './context-builder.service';
import { HermesClientService } from './hermes-client.service';
import { InteractionReceivedEvent } from '../../conversation';
export declare class LlmListenerService {
    private readonly contextBuilder;
    private readonly hermesClient;
    private readonly eventEmitter;
    private readonly logger;
    constructor(contextBuilder: ContextBuilderService, hermesClient: HermesClientService, eventEmitter: EventEmitter2);
    handleInteraction(payload: InteractionReceivedEvent): Promise<void>;
}
