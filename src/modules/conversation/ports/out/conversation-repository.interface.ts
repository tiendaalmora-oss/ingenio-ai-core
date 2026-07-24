import { Conversation } from '../../entities/conversation.entity';

export const CONVERSATION_REPOSITORY = Symbol('CONVERSATION_REPOSITORY');

export interface IConversationRepository {
  findById(id: string): Promise<Conversation | null>;
  findActiveByContact(contactId: string): Promise<Conversation | null>;
  save(conversation: Conversation): Promise<void>;
  /** Ensures the Contact row exists for (tenantId, phoneNormalized).
   *  Returns the internal UUID of the Contact. */
  ensureContactExists(tenantId: string, externalId: string): Promise<string>;
}
