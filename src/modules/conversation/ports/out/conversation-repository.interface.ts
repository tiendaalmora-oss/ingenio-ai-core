import { Conversation } from '../../entities/conversation.entity';

export const CONVERSATION_REPOSITORY = Symbol('CONVERSATION_REPOSITORY');

export interface IConversationRepository {
  findById(id: string): Promise<Conversation | null>;
  findActiveByContact(contactId: string): Promise<Conversation | null>;
  save(conversation: Conversation): Promise<void>;
  ensureContactExists(tenantId: string, contactId: string): Promise<void>;
}
