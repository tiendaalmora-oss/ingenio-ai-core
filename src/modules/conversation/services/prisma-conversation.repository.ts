import { Injectable } from '@nestjs/common';
import { IConversationRepository } from '../ports/out/conversation-repository.interface';
import { Conversation } from '../entities/conversation.entity';
import { PrismaService } from '../../../shared/database/prisma.service';

@Injectable()
export class PrismaConversationRepository implements IConversationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Conversation | null> {
    const raw = await this.prisma.conversation.findUnique({ where: { id } });
    if (!raw) return null;
    return new Conversation(raw.id, raw.contactId, raw.status);
  }

  async findActiveByContact(contactId: string): Promise<Conversation | null> {
    const raw = await this.prisma.conversation.findFirst({
      where: {
        contactId,
        status: { in: ['NEW', 'ACTIVE'] },
      },
    });
    if (!raw) return null;
    return new Conversation(raw.id, raw.contactId, raw.status);
  }

  async ensureContactExists(tenantId: string, contactId: string): Promise<void> {
    await this.prisma.contact.upsert({
      where: { id: contactId },
      update: {},
      create: {
        id: contactId,
        name: contactId,
        tenant: {
          connectOrCreate: {
            where: { id: tenantId },
            create: { id: tenantId, name: 'Default Tenant' },
          },
        },
      },
    });
  }

  async save(conversation: Conversation): Promise<void> {
    await this.prisma.conversation.upsert({
      where: { id: conversation.id },
      update: {
        status: conversation.status,
      },
      create: {
        id: conversation.id,
        contactId: conversation.contactId,
        status: conversation.status,
      },
    });
  }
}
