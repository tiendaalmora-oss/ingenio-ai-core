import { EventEmitter2 } from '@nestjs/event-emitter';
import type { IConversationRepository } from '../ports/out/conversation-repository.interface';
import type { IInteractionRepository } from '../ports/out/interaction-repository.interface';
export declare class ReceiveMessageService {
    private readonly conversationRepo;
    private readonly interactionRepo;
    private readonly eventEmitter;
    private readonly logger;
    constructor(conversationRepo: IConversationRepository, interactionRepo: IInteractionRepository, eventEmitter: EventEmitter2);
    execute(tenantId: string, contactId: string, content: string): Promise<void>;
}
