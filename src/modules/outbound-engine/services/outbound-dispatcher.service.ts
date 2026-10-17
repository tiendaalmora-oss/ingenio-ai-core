import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../shared/database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WahaAdapterService } from './waha-adapter.service';

@Injectable()
export class OutboundDispatcherService {
  private readonly logger = new Logger(OutboundDispatcherService.name);
  
  private metrics = {
    pending: 0,
    sent: 0,
    failed: 0,
    retry: 0
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly wahaAdapter: WahaAdapterService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  @Cron('0 * * * * *')
  async processPendingMessages() {
    // 0. Guardia de horario: no despachar seguimientos fuera de ventana de atención (7 AM - 10 PM Venezuela)
    const nowVET = new Date();
    const hourStr = (() => {
      try {
        return new Intl.DateTimeFormat('en-US', {
          hour: 'numeric', hour12: false, timeZone: 'America/Caracas'
        }).format(nowVET);
      } catch { return String(nowVET.getHours()); }
    })();
    const localHour = parseInt(hourStr, 10);
    if (!isNaN(localHour) && (localHour < 7 || localHour >= 22)) {
      this.logger.debug(`[OutboundDispatcher] Fuera de horario de atención (${localHour}:xx VET). Mensajes pendientes en cola hasta las 7 AM.`);
      return;
    }

    // 1. Dosificación estricta Anti-Ban: máximo 1 mensaje automático por minuto
    const pendingIds = await this.prisma.pendingOutboundMessage.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: 1,
      select: { id: true }
    });

    if (!pendingIds.length) {
      return;
    }

    const idsToProcess = pendingIds.map(p => p.id);

    // 2. Bloqueo Optimista: Actualizamos a PROCESSING solo los que siguen PENDING
    const updatedCount = await this.prisma.pendingOutboundMessage.updateMany({
      where: {
        id: { in: idsToProcess },
        status: 'PENDING'
      },
      data: {
        status: 'PROCESSING'
      }
    });

    if (updatedCount.count === 0) {
      return;
    }

    // 3. Traer los mensajes bloqueados
    const messagesToProcess = await this.prisma.pendingOutboundMessage.findMany({
      where: {
        id: { in: idsToProcess },
        status: 'PROCESSING'
      },
      orderBy: { createdAt: 'asc' }
    });

    this.metrics.pending += messagesToProcess.length;

    for (let i = 0; i < messagesToProcess.length; i++) {
      const msg = messagesToProcess[i];

      // ── CORTACIRCUITOS ANTI-BAN: Máximo 12 mensajes automáticos por hora por subcuenta ──
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const sentLastHour = await this.prisma.pendingOutboundMessage.count({
        where: {
          tenantId: msg.tenantId,
          status: 'SENT',
          sentAt: { gte: oneHourAgo }
        }
      });

      if (sentLastHour >= 12) {
        await this.prisma.pendingOutboundMessage.update({
          where: { id: msg.id },
          data: { status: 'PENDING' }
        });
        this.logger.warn(`[Anti-Ban Shield] Tope de 12 envíos automáticos/hora alcanzado para tenant ${msg.tenantId}. Mensaje pospuesto para proteger la línea.`);
        continue;
      }

      // Retardo humano aleatorio antes de despachar (4 a 10 segundos)
      const jitterMs = Math.floor(Math.random() * (10000 - 4000 + 1)) + 4000;
      await new Promise(resolve => setTimeout(resolve, jitterMs));

      const startTime = Date.now();
      try {
        const result = await this.wahaAdapter.sendMessage(msg.tenantId, msg.contactId, msg.message);
        const durationMs = Date.now() - startTime;
        
        await this.prisma.pendingOutboundMessage.update({
          where: { id: msg.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            durationMs,
            providerResponse: JSON.stringify({ id: result })
          }
        });

        // Registrar la interacción saliente en el historial del chat
        if (msg.conversationId) {
          try {
            await this.prisma.interaction.create({
              data: {
                conversationId: msg.conversationId,
                direction: 'OUTBOUND',
                type: 'TEXT',
                content: msg.message,
                role: 'assistant',
              }
            });
          } catch (e: any) {
            this.logger.warn(`No se pudo guardar interaction para mensaje ${msg.id}: ${e.message}`);
          }
        }
        
        this.metrics.sent++;
        
        this.eventEmitter.emit('OUTBOUND_MESSAGE_SENT', {
          id: msg.id,
          tenantId: msg.tenantId,
          contactId: msg.contactId,
          durationMs
        });
        
      } catch (error: any) {
        const durationMs = Date.now() - startTime;
        const newRetries = msg.retries + 1;
        
        if (newRetries < 3) {
          await this.prisma.pendingOutboundMessage.update({
            where: { id: msg.id },
            data: {
              status: 'PENDING',
              retries: newRetries,
              durationMs,
              providerResponse: JSON.stringify({ error: error.message })
            }
          });
          this.metrics.retry++;
        } else {
          await this.prisma.pendingOutboundMessage.update({
            where: { id: msg.id },
            data: {
              status: 'FAILED',
              retries: newRetries,
              durationMs,
              providerResponse: JSON.stringify({ error: error.message })
            }
          });
          this.metrics.failed++;
          
          this.eventEmitter.emit('OUTBOUND_MESSAGE_FAILED', {
            id: msg.id,
            tenantId: msg.tenantId,
            contactId: msg.contactId,
            error: error.message
          });
        }
      }
    }
    
    this.logger.debug(`Métricas de despacho: SENT=${this.metrics.sent}, FAILED=${this.metrics.failed}, RETRY=${this.metrics.retry}`);
  }

  getMetrics() {
    return { ...this.metrics };
  }
}
