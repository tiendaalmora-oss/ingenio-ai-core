import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../shared/database/prisma.service';
import { sendTelegramSaleAlert } from '../../../shared/utils/telegram-alert.util';
import { PushNotificationService } from '../../notifications/push-notification.service';

// Tipos extraídos de los eventos públicos (Para mantener el acoplamiento mínimo, 
// podríamos importar las clases de evento exactas, pero podemos usar duck-typing para el payload)

@Injectable()
export class CrmEventListenerService {
  private readonly logger = new Logger(CrmEventListenerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  @OnEvent('memory.updated', { async: true })
  async handleMemoryUpdated(payload: any) {
    this.logger.debug(`handleMemoryUpdated: contactId=${payload.contactId}`);
    this.logger.log(`[CRM] Actualizando Business Memory para Contacto: ${payload.contactId}`);
    try {
      const updates = payload.updates;

      // 1. Leer estado ANTES del upsert para fusión no-destructiva y audit log
      const before = await this.prisma.businessMemory.findUnique({
        where: { contactId: payload.contactId },
      });

      // Fusión no-destructiva (Set Merge): los nuevos intereses van primero (producto activo en foco) sin borrar los anteriores
      const mergedInterests = updates.interests !== undefined
        ? Array.from(new Set([
            ...(Array.isArray(updates.interests) ? updates.interests : []),
            ...((before?.interests as string[]) || []),
          ].map(s => String(s).trim()).filter(Boolean)))
        : undefined;

      const mergedObjections = updates.objections !== undefined
        ? Array.from(new Set([
            ...((before?.objections as string[]) || []),
            ...(Array.isArray(updates.objections) ? updates.objections : []),
          ].map(s => String(s).trim()).filter(Boolean)))
        : undefined;

      const mergedTags = updates.tags !== undefined
        ? Array.from(new Set([
            ...((before?.tags as string[]) || []),
            ...(Array.isArray(updates.tags) ? updates.tags : []),
          ].map(s => String(s).trim()).filter(Boolean)))
        : undefined;

      // Protección de temperatura: evitar que el LLM degrade accidentalmente un lead HOT/CLOSED a WARM/COLD
      const statusRank: Record<string, number> = {
        NEW: 0, COLD: 1, CONTACTED: 1, WARM: 2, HOT: 3, OFFER: 3, DEMO: 3, SALE: 4, CLOSED: 4, CLIENT: 4,
      };
      let resolvedLeadStatus = updates.leadStatus;
      if (resolvedLeadStatus && before?.leadStatus) {
        const prevUpper = before.leadStatus.toUpperCase();
        const nextUpper = String(resolvedLeadStatus).toUpperCase();
        if (nextUpper !== 'LOST' && nextUpper !== 'HANDOFF') {
          const prevRank = statusRank[prevUpper] ?? 0;
          const nextRank = statusRank[nextUpper] ?? 0;
          if (prevRank > nextRank) {
            resolvedLeadStatus = before.leadStatus;
          }
        }
      }

      // 2. Ejecutar el upsert con los datos fusionados
      await this.prisma.businessMemory.upsert({
        where: { contactId: payload.contactId },
        update: {
          ...(updates.name           !== undefined && { name:       updates.name }),
          ...(updates.company        !== undefined && { company:    updates.company }),
          ...(mergedInterests        !== undefined && { interests:  mergedInterests }),
          ...(mergedObjections       !== undefined && { objections: mergedObjections }),
          ...(resolvedLeadStatus     !== undefined && { leadStatus: resolvedLeadStatus }),
          ...(mergedTags             !== undefined && { tags:       mergedTags }),
        },
        create: {
          contactId:   payload.contactId,
          name:        updates.name,
          company:     updates.company,
          interests:   mergedInterests  || [],
          objections:  mergedObjections || [],
          leadStatus:  resolvedLeadStatus,
          tags:        mergedTags       || [],
        },
      });
      this.logger.debug(`BusinessMemory upserted for contactId=${payload.contactId}`);

      // 3. Sincronizar nombre del contacto
      if (updates.name) {
        await this.prisma.contact.update({
          where: { id: payload.contactId },
          data: { name: updates.name },
        });
      }

      // 4. Escribir audit log por cada campo que cambió
      const auditEntries: any[] = [];
      const trackedFields = ['name', 'company', 'interests', 'objections', 'leadStatus', 'tags'];

      for (const field of trackedFields) {
        if (updates[field] === undefined) continue;

        const prevRaw = before ? (before as any)[field] : null;
        const newRaw  = updates[field];

        // Detectar si realmente cambió
        const prevStr = JSON.stringify(prevRaw ?? null);
        const newStr  = JSON.stringify(newRaw  ?? null);
        if (prevStr === newStr) continue;

        auditEntries.push({
          contactId:     payload.contactId,
          tenantId:      payload.tenantId ?? null,
          field,
          previousValue: prevStr,
          newValue:      newStr,
          source:        'hermes',
          skill:         'update_business_memory',
          confidence:    0.85,
          conversationId: payload.conversationId ?? null,
        });
      }

      if (auditEntries.length > 0) {
        await this.prisma.memoryAuditLog.createMany({ data: auditEntries });
        this.logger.log(`[CRM] ${auditEntries.length} audit entries guardadas para ${payload.contactId}`);
      }

      // 5. Detectar venta automatica y notificar a Telegram con sonido
      const isNewSale = (
        (resolvedLeadStatus === 'CLOSED' && before?.leadStatus !== 'CLOSED') ||
        (mergedTags?.includes('PAGO_CONFIRMADO') && !(before?.tags as string[] || []).includes('PAGO_CONFIRMADO'))
      );

      if (isNewSale) {
        this.prisma.contact.findUnique({
          where: { id: payload.contactId },
        }).then((ct) => {
          const prodName = (mergedInterests && mergedInterests[0]) || 'Producto Digital';
          const isBarber = prodName.toLowerCase().includes('barber');
          sendTelegramSaleAlert({
            productName: prodName,
            customerName: updates.name || ct?.name || undefined,
            customerPhone: ct?.phone || undefined,
            amountFormatted: isBarber ? '6 USDT / 6.024 Bs' : 'Pago Confirmado',
            statusText: isBarber ? 'Acceso entregado automaticamente por WhatsApp' : 'Comprobante acreditado',
            accessUrl: isBarber ? 'https://barber.ingenioos.online/?registro=1' : undefined,
          }).catch(() => {});

          // Disparar Web Push a la barra del teléfono (con aislamiento multi-tenant)
          this.pushNotificationService.notifySale(payload.tenantId || ct?.tenantId, {
            productName: prodName,
            customerName: updates.name || ct?.name || undefined,
            amountFormatted: isBarber ? '6 USDT / 6.024 Bs' : 'Pago Confirmado',
            reference: undefined,
          }).catch(() => {});
        }).catch(() => {});
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
