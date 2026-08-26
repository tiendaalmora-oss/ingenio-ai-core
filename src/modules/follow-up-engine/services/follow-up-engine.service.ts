import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../shared/database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class FollowUpEngineService {
  private readonly logger = new Logger(FollowUpEngineService.name);

  // Ventana horaria de atención respetuosa (por defecto 8:00 AM a 11:59 PM)
  private readonly DEFAULT_START_HOUR = 8;
  private readonly DEFAULT_END_HOUR = 24;

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async evaluateFollowUps() {
    const now = new Date();

    // 1. Validar ventana horaria de envío con zona horaria local de Latinoamérica
    if (!this.isWithinAllowedWindow(now, this.DEFAULT_START_HOUR, this.DEFAULT_END_HOUR)) {
      this.logger.debug(`Fuera de la ventana horaria permitida (${this.DEFAULT_START_HOUR}:00 - ${this.DEFAULT_END_HOUR}:00). Omitiendo seguimientos nocturnos.`);
      return;
    }

    // 2. Evaluar conversaciones activas (tanto 'NEW' como 'ACTIVE')
    const activeConversations = await this.prisma.conversation.findMany({
      where: {
        status: { in: ['NEW', 'ACTIVE'] }
      },
      include: {
        contact: {
          include: { memory: true }
        },
        interactions: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    });

    if (!activeConversations.length) {
      return;
    }

    const tenantIds = [...new Set(activeConversations.map(c => c.contact.tenantId))];

    for (const tenantId of tenantIds) {
      const bundle = await this.prisma.knowledgeBundle.findUnique({
        where: { tenantId }
      });

      if (!bundle) continue;
      
      let systemPrompt: any = bundle.systemPrompt || {};
      let rawData: any = systemPrompt['_raw'] || systemPrompt;
      let seguimientos = rawData['seguimientos'] || [];

      if (!Array.isArray(seguimientos) || seguimientos.length === 0) continue;

      // Ordenar reglas por tiempo de menor a mayor (ej: 5 min antes de 1 hora)
      const sortedRules = [...seguimientos].sort((a, b) => this.parseDelayMs(a) - this.parseDelayMs(b));

      const tenantConvos = activeConversations.filter(c => c.contact.tenantId === tenantId);

      for (const convo of tenantConvos) {
        // No enviar seguimientos a leads que ya pagaron o con venta cerrada
        const leadStatus = (convo.contact.memory?.leadStatus || '').toUpperCase();
        if (leadStatus === 'CLOSED' || leadStatus === 'PAGADO') {
          continue;
        }

        const lastInteraction = convo.interactions.length > 0 ? convo.interactions[0] : null;
        if (!lastInteraction) continue;

        const timeSinceLastInteraction = Date.now() - lastInteraction.timestamp.getTime();

        for (const rule of sortedRules) {
          const delayMs = this.parseDelayMs(rule);

          if (timeSinceLastInteraction >= delayMs) {
            const ruleIdentifier = rule.id || `rule-${rule.tiempo || 'default'}-${delayMs}`;

            // Evitar enviar el mismo seguimiento repetido en las últimas 24 horas si ya está encolado o enviado
            const alreadyDispatched = await this.prisma.pendingOutboundMessage.findFirst({
              where: {
                conversationId: convo.id,
                followUpId: ruleIdentifier,
                status: { in: ['PENDING', 'PROCESSING', 'SENT'] },
                createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
              }
            });

            if (alreadyDispatched) continue;

            const payload = {
              tenantId: tenantId,
              conversationId: convo.id,
              contactId: convo.contactId,
              followUpId: ruleIdentifier,
              ruleApplied: rule,
              timestamp: new Date()
            };
            
            this.logger.log(`[FollowUpEngine] ✅ Oportunidad de seguimiento activada para ${convo.contact.name || convo.contactId} (hace ${Math.round(timeSinceLastInteraction / 60000)} min), regla: ${rule.tiempo || ruleIdentifier}`);
            
            this.eventEmitter.emit('FOLLOW_UP_PENDING', payload);
            
            // Evaluamos solo una regla por conversación para no saturar al cliente
            break;
          }
        }
      }
    }
  }

  /**
   * Comprueba si la hora actual está dentro de la ventana de atención respetuosa considerando zona horaria.
   */
  private isWithinAllowedWindow(now: Date, startHour: number, endHour: number): boolean {
    try {
      // Usar America/Caracas (UTC-4) o extraer la hora local
      const hourStr = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        hour12: false,
        timeZone: 'America/Caracas',
      }).format(now);
      const localHour = parseInt(hourStr, 10);
      return localHour >= startHour && localHour < endHour;
    } catch {
      const currentHour = now.getHours();
      return currentHour >= startHour && currentHour < endHour;
    }
  }

  /**
   * Interpreta cadenas de tiempo en lenguaje natural como '2 horas', '30 min', '24h', '1 día'.
   */
  private parseDelayMs(rule: any): number {
    if (rule.delayHours && !isNaN(Number(rule.delayHours))) {
      return Number(rule.delayHours) * 60 * 60 * 1000;
    }
    const text = `${rule.tiempo || ''} ${rule.condition || ''} ${rule.condicion || ''}`.toLowerCase();
    
    // Minutos: '2 min', '5 minutos', '30m'
    const minMatch = text.match(/(\d+)\s*(?:m|min|minuto|minutos)\b/);
    if (minMatch) return parseInt(minMatch[1], 10) * 60 * 1000;

    // Horas: '1 hora', '2 horas', '24h'
    const hoursMatch = text.match(/(\d+)\s*(?:h|hora|horas)\b/);
    if (hoursMatch) return parseInt(hoursMatch[1], 10) * 60 * 60 * 1000;
    
    // Días: '1 dia', '2 días', '1d'
    const daysMatch = text.match(/(\d+)\s*(?:d|dia|dias|día|días)\b/);
    if (daysMatch) return parseInt(daysMatch[1], 10) * 24 * 60 * 60 * 1000;

    return 24 * 60 * 60 * 1000; // 24 horas por defecto
  }
}
