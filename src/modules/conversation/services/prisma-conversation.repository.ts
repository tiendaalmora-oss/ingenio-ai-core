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

  async ensureContactExists(tenantId: string, externalId: string): Promise<string> {
    // Normalize: strip WAHA suffixes (@c.us, @lid, @s.whatsapp.net)
    const phoneNormalized = externalId.replace(/@(c\.us|lid|s\.whatsapp\.net)$/, '');
    const phone = phoneNormalized; // same for now; can diverge if we add country-code logic

    const contact = await this.prisma.contact.upsert({
      where: {
        tenantId_phoneNormalized: { tenantId, phoneNormalized },
      },
      update: {
        // Keep externalId up to date in case WAHA changes suffix format
        externalId,
      },
      create: {
        externalId,
        phone,
        phoneNormalized,
        name: phoneNormalized,
        tenant: {
          connectOrCreate: {
            where: { id: tenantId },
            create: { id: tenantId, name: 'Default Tenant' },
          },
        },
      },
      select: { id: true },
    });

    return contact.id;
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
