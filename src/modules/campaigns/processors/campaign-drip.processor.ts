import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../../../shared/database/prisma.service';
import { WahaAdapterService } from '../../outbound-engine/services/waha-adapter.service';
import { EmailSenderService } from '../services/email-sender.service';

@Injectable()
export class CampaignDripProcessor {
  private readonly logger = new Logger(CampaignDripProcessor.name);
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly wahaAdapter: WahaAdapterService,
    private readonly emailSender: EmailSenderService,
  ) {}

  /**
   * Ciclo de despacho seguro de goteo antiban (ejecuta cada 4 segundos).
   */
  @Interval(4000)
  async handleDripDispatch(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // 1. Buscar campañas en ejecución
      const runningCampaigns = await this.prisma.campaign.findMany({
        where: { status: 'RUNNING' },
      });

      if (runningCampaigns.length === 0) return;

      for (const campaign of runningCampaigns) {
        await this.processSingleCampaign(campaign);
      }
    } catch (err: any) {
      this.logger.error(`[CampaignDrip] Excepción en ciclo de goteo: ${err.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Procesa 1 envío por turno para una campaña respetando el intervalo de goteo.
   */
  private async processSingleCampaign(campaign: any): Promise<void> {
    const campaignId = campaign.id;

    // a. Verificar cuándo se envió el último mensaje para respetar el intervalo antiban
    const lastSentItem = await this.prisma.campaignItem.findFirst({
      where: { campaignId, status: 'SENT' },
      orderBy: { sentAt: 'desc' },
      select: { sentAt: true },
    });

    if (lastSentItem && lastSentItem.sentAt) {
      const baseIntervalMs = (campaign.dripIntervalSeconds || 30) * 1000;
      // Añadir jitter aleatorio (-3s a +4s) para romper patrones robóticos
      const randomJitterMs = Math.floor(Math.random() * 7000) - 3000;
      const effectiveDelayMs = Math.max(15000, baseIntervalMs + randomJitterMs);

      const elapsedMs = Date.now() - new Date(lastSentItem.sentAt).getTime();
      if (elapsedMs < effectiveDelayMs) {
        // Aún estamos en el tiempo de espera seguro
        return;
      }
    }

    // b. Obtener el siguiente ítem pendiente
    const item = await this.prisma.campaignItem.findFirst({
      where: { campaignId, status: 'PENDING' },
      include: {
        contact: {
          include: {
            conversations: {
              orderBy: { id: 'desc' },
              take: 1,
            },
            memory: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Si no quedan ítems pendientes, la campaña ha finalizado con éxito
    if (!item) {
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'COMPLETED' },
      });
      this.logger.log(`[CampaignDrip] ¡Campaña "${campaign.name}" completada al 100%!`);
      return;
    }

    // c. Marcar el ítem como SENDING para evitar condiciones de carrera
    await this.prisma.campaignItem.update({
      where: { id: item.id },
      data: { status: 'SENDING' },
    });

    const tenantId = campaign.tenantId;
    const phone = item.recipientPhone || item.contact?.phone || item.contact?.externalId;
    const content = item.renderedMessage || campaign.messageTemplate;

    try {
      // ── DESPACHO VÍA WHATSAPP ──────────────────────────────────────────
      if (campaign.channel === 'WHATSAPP' || campaign.channel === 'BOTH') {
        if (!phone) {
          throw new Error('El contacto no posee número de teléfono registrado');
        }

        // 1. Simulación humana de presencia ("Escribiendo...")
        await this.wahaAdapter.startTyping(tenantId, phone).catch(() => {});
        await new Promise((r) => setTimeout(r, 2500));

        // 2. Envío de mensaje o multimedia
        if (campaign.mediaUrl) {
          await this.wahaAdapter.sendFile(
            tenantId,
            phone,
            campaign.mediaUrl,
            content,
            campaign.mediaFilename,
            campaign.mediaType === 'IMAGE' ? 'image/jpeg' : 'application/pdf',
          );
        } else {
          await this.wahaAdapter.sendMessage(tenantId, phone, content);
        }

        // 3. REGISTRO EN LA CONVERSACIÓN DEL CONTACTO (OPCIÓN 1: CONTEXTO PLENO)
        // Esto garantiza que si el cliente responde, el LLM lee este mensaje en el historial
        let convId = item.contact?.conversations?.[0]?.id;
        if (!convId) {
          const newConv = await this.prisma.conversation.create({
            data: {
              contactId: item.contactId,
              status: 'RESOLVED',
            },
          });
          convId = newConv.id;
        }

        await this.prisma.interaction.create({
          data: {
            conversationId: convId,
            direction: 'OUTBOUND',
            type: campaign.mediaUrl ? 'IMAGE' : 'TEXT',
            role: 'assistant',
            content,
            timestamp: new Date(),
          },
        });

        // 4. Actualizar memoria y agregar tag de auditoría de campaña
        const campaignTag = `CAMPANA_${campaign.name
          .toUpperCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^A-Z0-9]/g, '_')
          .slice(0, 24)}`;

        const existingTags = item.contact?.memory?.tags || [];
        const updatedTags = Array.from(new Set([...existingTags, campaignTag]));

        await this.prisma.businessMemory.upsert({
          where: { contactId: item.contactId },
          update: {
            lastInteraction: new Date(),
            tags: updatedTags,
          },
          create: {
            contactId: item.contactId,
            lastInteraction: new Date(),
            tags: updatedTags,
          },
        });
      }

      // ── DESPACHO VÍA EMAIL ─────────────────────────────────────────────
      if (campaign.channel === 'EMAIL' || campaign.channel === 'BOTH') {
        const email = item.recipientEmail || item.contact?.memory?.company;
        if (email && email.includes('@')) {
          await this.emailSender.sendEmail({
            to: email,
            subject: campaign.subject || `Novedad de ${campaign.name}`,
            text: content,
          });
        }
      }

      // d. Actualizar ítem como SENT
      await this.prisma.campaignItem.update({
        where: { id: item.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
        },
      });

      // e. Incrementar contador de la campaña
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: {
          sentCount: { increment: 1 },
        },
      });

      this.logger.log(`[CampaignDrip] Mensaje entregado con éxito a ${item.recipientName || phone} (${campaign.name})`);
    } catch (sendErr: any) {
      this.logger.error(`[CampaignDrip] Falló entrega a ${phone || item.id}: ${sendErr.message}`);

      await this.prisma.campaignItem.update({
        where: { id: item.id },
        data: {
          status: 'FAILED',
          errorMessage: sendErr.message || 'Error de entrega en proveedor',
        },
      });

      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: {
          failedCount: { increment: 1 },
        },
      });
    }
  }
}
