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
      },
    });
    if (!raw) return null;
    return new Conversation(raw.id, raw.contactId, raw.status);
  }

  async ensureContactExists(tenantId: string, externalId: string, pushName?: string): Promise<string> {
    // 1. Limpiar sufijos de dispositivo como ":12@c.us" o ":0@c.us"
    const cleanExternalId = externalId.replace(/:\d+@/, '@');

    // 2. Extraer dígitos reales normalizados
    const phoneNormalized = cleanExternalId.replace(/@(c\.us|lid|s\.whatsapp\.net)$/, '').replace(/\D/g, '');
    const phone = phoneNormalized;

    // 3. Nombre del contacto: si viene pushName (nombre de perfil de WhatsApp), usarlo
    const trimmedPushName = pushName && pushName.trim() ? pushName.trim() : undefined;

    const contact = await this.prisma.contact.upsert({
      where: {
        tenantId_phoneNormalized: { tenantId, phoneNormalized },
      },
      update: {
        externalId: cleanExternalId,
        phone,
        ...(trimmedPushName ? { name: trimmedPushName } : {}),
      },
      create: {
        externalId: cleanExternalId,
        phone,
        phoneNormalized,
        name: trimmedPushName || phoneNormalized || 'Prospecto',
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
