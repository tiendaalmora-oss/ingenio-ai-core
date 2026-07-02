import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../shared/database/prisma.service';

// Tipos extraídos de los eventos públicos (Para mantener el acoplamiento mínimo, 
// podríamos importar las clases de evento exactas, pero podemos usar duck-typing para el payload)

@Injectable()
export class CrmEventListenerService {
  private readonly logger = new Logger(CrmEventListenerService.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('memory.updated', { async: true })
  async handleMemoryUpdated(payload: any) {
    this.logger.log(`[CRM] Actualizando Business Memory para Contacto: ${payload.contactId}`);
    try {
      const updates = payload.updates;
      await this.prisma.businessMemory.upsert({
        where: { contactId: payload.contactId },
        update: {
          name: updates.name,
          company: updates.company,
          interests: updates.interests,
          objections: updates.objections,
          leadStatus: updates.leadStatus,
          tags: updates.tags,
        },
        create: {
          contactId: payload.contactId,
          name: updates.name,
          company: updates.company,
          interests: updates.interests || [],
          objections: updates.objections || [],
          leadStatus: updates.leadStatus,
          tags: updates.tags || [],
        },
      });
      
      // Sincronizar el nombre del contacto en la tabla principal
      if (updates.name) {
        await this.prisma.contact.update({
          where: { id: payload.contactId },
          data: { name: updates.name }
        });
      }
    } catch (error) {
      this.logger.error('[CRM] Falló actualización de Business Memory:', error);
    }
  }

  @OnEvent('task.created', { async: true })
  async handleTaskCreated(payload: any) {
    this.logger.log(`[CRM] Creando Task para Contacto: ${payload.contactId}`);
    try {
      await this.prisma.task.create({
        data: {
          contactId: payload.contactId,
          title: payload.taskDetails.title,
          dueDate: payload.taskDetails.dueDate ? new Date(payload.taskDetails.dueDate) : null,
          status: 'PENDING',
        },
      });
    } catch (error) {
      this.logger.error('[CRM] Falló creación de Task:', error);
    }
  }

  @OnEvent('handoff.requested', { async: true })
  async handleHandoffRequested(payload: any) {
    this.logger.log(`[CRM] Marcando Conversación como HANDOFF: ${payload.conversationId}`);
    try {
      await this.prisma.conversation.update({
        where: { id: payload.conversationId },
        data: { status: 'HANDOFF' },
      });
    } catch (error) {
      this.logger.error('[CRM] Falló actualización a HANDOFF:', error);
    }
  }

  @OnEvent('message.sent', { async: true })
  async handleMessageSent(payload: any) {
    this.logger.log(`[CRM] Mensaje enviado por canal ${payload.channel}. Registrando métricas...`);
    // Aquí el CRM podría deducir un crédito del Tenant, actualizar "lastInteraction" en BusinessMemory, etc.
    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: payload.conversationId },
        select: { contactId: true }
      });
      
      if (conversation) {
        await this.prisma.businessMemory.upsert({
          where: { contactId: conversation.contactId },
          update: { lastInteraction: new Date() },
          create: { contactId: conversation.contactId, lastInteraction: new Date() }
        });
      }
    } catch (error) {
      this.logger.error('[CRM] Falló registro de métrica message.sent:', error);
    }
  }
}
