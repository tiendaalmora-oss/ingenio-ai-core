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

  // Límites Anti-Ban para campañas de WhatsApp
  private readonly MAX_CAMPAIGN_WHATSAPP_PER_HOUR = 20;
  private readonly MAX_CAMPAIGN_WHATSAPP_PER_DAY = 120;
  private readonly ALLOWED_START_HOUR = 7;  // 7:00 AM VET
  private readonly ALLOWED_END_HOUR = 22;   // 9:59 PM VET

  /**
   * Comprueba si la hora actual está dentro de la ventana diurna segura (7 AM a 9:59 PM hora Caracas/VET).
   */
  private isWithinAllowedWindow(now: Date): boolean {
    try {
      const hourStr = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        hour12: false,
        timeZone: 'America/Caracas',
      }).format(now);
      const localHour = parseInt(hourStr, 10);
      if (isNaN(localHour)) return true;
      return localHour >= this.ALLOWED_START_HOUR && localHour < this.ALLOWED_END_HOUR;
    } catch {
      const currentHour = now.getHours();
      return currentHour >= this.ALLOWED_START_HOUR && currentHour < this.ALLOWED_END_HOUR;
    }
  }

  /**
   * Ciclo de despacho seguro de goteo antiban (ejecuta cada 10 segundos).
   */
  @Interval(10000)
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
   * Procesa 1 envío por turno para una campaña respetando el escudo Anti-Ban multicapa.
   */
  private async processSingleCampaign(campaign: any): Promise<void> {
    const campaignId = campaign.id;
    const tenantId = campaign.tenantId;
    const isWhatsApp = campaign.channel === 'WHATSAPP' || campaign.channel === 'BOTH';
    const now = new Date();

    // ── CAPA 1: Ventana Horaria Respetuosa (7:00 AM a 9:59 PM VET) para WhatsApp ──
    if (isWhatsApp && !this.isWithinAllowedWindow(now)) {
      return;
    }

    // ── CAPA 2: Circuit Breaker por Hora y por Día (por Subcuenta) ──
    if (isWhatsApp) {
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const [sentLastHour, sentLastDay] = await Promise.all([
        this.prisma.campaignItem.count({
          where: {
            status: 'SENT',
            sentAt: { gte: oneHourAgo },
            campaign: { tenantId, channel: { in: ['WHATSAPP', 'BOTH'] } },
          },
        }),
        this.prisma.campaignItem.count({
          where: {
            status: 'SENT',
            sentAt: { gte: oneDayAgo },
            campaign: { tenantId, channel: { in: ['WHATSAPP', 'BOTH'] } },
          },
        }),
      ]);

      if (sentLastHour >= this.MAX_CAMPAIGN_WHATSAPP_PER_HOUR || sentLastDay >= this.MAX_CAMPAIGN_WHATSAPP_PER_DAY) {
        this.logger.debug(
          `[CampaignDrip Anti-Ban] Subcuenta ${tenantId} alcanzó tope seguro (${sentLastHour}/${this.MAX_CAMPAIGN_WHATSAPP_PER_HOUR} hora, ${sentLastDay}/${this.MAX_CAMPAIGN_WHATSAPP_PER_DAY} día). Esperando enfriamiento.`,
        );
        return;
      }
    }

    // ── CAPA 3: Auto-Pausa de Emergencia si los últimos 3 intentos fallaron seguidos (ej. WhatsApp desconectado) ──
    const recentProcessed = await this.prisma.campaignItem.findMany({
      where: { campaignId, status: { in: ['SENT', 'FAILED'] } },
      orderBy: { updatedAt: 'desc' },
      take: 3,
      select: { status: true },
    });
    if (recentProcessed.length === 3 && recentProcessed.every((item) => item.status === 'FAILED')) {
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'PAUSED' },
      });
      this.logger.warn(
        `[CampaignDrip Circuit-Breaker] ⏸️ Campaña "${campaign.name}" pausada automáticamente tras 3 fallos consecutivos de entrega (verifica la conexión de WhatsApp de la subcuenta).`,
      );
      return;
    }

    // a. Verificar cuándo se envió el último mensaje para respetar el intervalo antiban + pausa de lote
    const lastSentItem = await this.prisma.campaignItem.findFirst({
      where: { campaignId, status: 'SENT' },
      orderBy: { sentAt: 'desc' },
      select: { sentAt: true },
    });

    if (lastSentItem && lastSentItem.sentAt) {
      const minIntervalSec = isWhatsApp ? Math.max(45, campaign.dripIntervalSeconds || 60) : Math.max(15, campaign.dripIntervalSeconds || 30);
      let effectiveDelayMs = minIntervalSec * 1000;

      // Añadir jitter humano aleatorio (+0s a +20s en WhatsApp)
      const randomJitterMs = isWhatsApp ? Math.floor(Math.random() * 20000) : Math.floor(Math.random() * 5000);
      effectiveDelayMs += randomJitterMs;

      // Enfriamiento humano adicional de 5 minutos cada 10 mensajes enviados en la campaña
      if (isWhatsApp && campaign.sentCount > 0 && campaign.sentCount % 10 === 0) {
        effectiveDelayMs += 5 * 60 * 1000;
      }

      const elapsedMs = Date.now() - new Date(lastSentItem.sentAt).getTime();
      if (elapsedMs < effectiveDelayMs) {
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
