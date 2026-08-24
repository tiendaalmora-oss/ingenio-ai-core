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

  @Cron('*/30 * * * * *')
  async processPendingMessages() {
    this.logger.debug('Buscando mensajes salientes pendientes...');

    // Orden FIFO
    const pendingIds = await this.prisma.pendingOutboundMessage.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: 20,
      select: { id: true }
    });

    if (!pendingIds.length) {
      return;
    }

    const idsToProcess = pendingIds.map(p => p.id);

    // Bloqueo Optimista: Actualizamos a PROCESSING solo los que siguen PENDING
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

    // Traer los mensajes bloqueados
    const messagesToProcess = await this.prisma.pendingOutboundMessage.findMany({
      where: {
        id: { in: idsToProcess },
        status: 'PROCESSING'
      },
      orderBy: { createdAt: 'asc' }
    });

    this.metrics.pending += messagesToProcess.length;

    for (const msg of messagesToProcess) {
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
}
