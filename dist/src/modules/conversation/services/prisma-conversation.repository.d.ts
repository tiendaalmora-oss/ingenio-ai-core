import { IConversationRepository } from '../ports/out/conversation-repository.interface';
import { Conversation } from '../entities/conversation.entity';
import { PrismaService } from '../../../shared/database/prisma.service';
export declare class PrismaConversationRepository implements IConversationRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findById(id: string): Promise<Conversation | null>;
    findActiveByContact(contactId: string): Promise<Conversation | null>;
    ensureContactExists(tenantId: string, contactId: string): Promise<void>;
    save(conversation: Conversation): Promise<void>;
}
