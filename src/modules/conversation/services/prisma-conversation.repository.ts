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
    // 1. Limpiar SOLO sufijos de dispositivo multi-dispositivo como ":12@c.us" → "@c.us"
    const cleanExternalId = externalId.replace(/:\d+@/, '@');

    // 2. Extraer phoneNormalized: solo dígitos, sin el sufijo @c.us / @lid / etc.
    const phoneNormalized = cleanExternalId
      .replace(/@(c\.us|lid|s\.whatsapp\.net)$/, '')
      .replace(/\D/g, '');

    // 3. phone: igual que phoneNormalized
    const phone = phoneNormalized;

    // 4. Nombre del contacto: si viene pushName (nombre de perfil de WhatsApp), usarlo
    const trimmedPushName = pushName && pushName.trim() ? pushName.trim() : undefined;

    // 5. Para el externalId guardado, preferir siempre @c.us sobre @lid para que el
    //    WAHA adapter pueda enrutar correctamente. Solo si el externalId es @lid y
    //    ya tenemos los dígitos, convertir a @c.us.
    let safeExternalId = cleanExternalId;
    if (safeExternalId.includes('@lid') && phoneNormalized) {
      safeExternalId = `${phoneNormalized}@c.us`;
    }

    const contact = await this.prisma.contact.upsert({
      where: {
        tenantId_phoneNormalized: { tenantId, phoneNormalized },
      },
      update: {
        // Solo actualizar externalId si el nuevo es @c.us (más confiable para routing)
        // No degradar de @c.us a @lid
        ...(safeExternalId.includes('@c.us') ? { externalId: safeExternalId } : {}),
        phone,
        ...(trimmedPushName ? { name: trimmedPushName } : {}),
      },
      create: {
        externalId: safeExternalId,
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
