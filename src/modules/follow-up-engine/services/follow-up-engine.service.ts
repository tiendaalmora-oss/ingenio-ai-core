import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../shared/database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class FollowUpEngineService {
  private readonly logger = new Logger(FollowUpEngineService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async evaluateFollowUps() {
    // Evaluar únicamente conversaciones ACTIVAS
    const activeConversations = await this.prisma.conversation.findMany({
      where: {
        status: 'ACTIVE'
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
      // Leer las reglas de seguimiento desde Knowledge Bundle
      const bundle = await this.prisma.knowledgeBundle.findUnique({
        where: { tenantId }
      });

      if (!bundle) continue;
      
      let systemPrompt: any = bundle.systemPrompt || {};
      let rawData: any = systemPrompt['_raw'] || systemPrompt;
      let seguimientos = rawData['seguimientos'] || [];

      if (!Array.isArray(seguimientos) || seguimientos.length === 0) continue;

      const tenantConvos = activeConversations.filter(c => c.contact.tenantId === tenantId);

      for (const convo of tenantConvos) {
        // No enviar seguimientos si el lead ya pagó o la venta se cerró
        if (convo.contact.memory?.leadStatus === 'CLOSED' || convo.contact.memory?.leadStatus === 'PAGADO') {
          continue;
        }

        const lastInteraction = convo.interactions.length > 0 ? convo.interactions[0] : null;
        if (!lastInteraction) continue;

        const timeSinceLastInteraction = Date.now() - lastInteraction.timestamp.getTime();

        for (const rule of seguimientos) {
          const delayMs = this.parseDelayMs(rule);

          if (timeSinceLastInteraction > delayMs) {
            const ruleIdentifier = rule.id || `rule-${rule.tiempo || 'default'}-${delayMs}`;

            // Evitar enviar el mismo seguimiento repetido en las últimas 24 horas
            const alreadyDispatched = await this.prisma.pendingOutboundMessage.findFirst({
              where: {
                conversationId: convo.id,
                followUpId: ruleIdentifier,
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
            
            this.logger.log(`[FollowUpEngine] Oportunidad de seguimiento detectada para contacto ${convo.contactId}, regla: ${ruleIdentifier}`);
            
            this.eventEmitter.emit('FOLLOW_UP_PENDING', payload);
            
            // Detenemos evaluación de esta conversación para no saturar con múltiples reglas simultáneas
            break;
          }
        }
      }
    }
  }

  private parseDelayMs(rule: any): number {
    if (rule.delayHours && !isNaN(Number(rule.delayHours))) {
      return Number(rule.delayHours) * 60 * 60 * 1000;
    }
    const text = `${rule.tiempo || ''} ${rule.condition || ''} ${rule.condicion || ''}`.toLowerCase();
    
    const hoursMatch = text.match(/(\d+)\s*(?:h|hora|horas)/);
    if (hoursMatch) return parseInt(hoursMatch[1], 10) * 60 * 60 * 1000;
    
    const minMatch = text.match(/(\d+)\s*(?:m|min|minuto|minutos)/);
    if (minMatch) return parseInt(minMatch[1], 10) * 60 * 1000;
    
    const daysMatch = text.match(/(\d+)\s*(?:d|dia|dias|día|días)/);
    if (daysMatch) return parseInt(daysMatch[1], 10) * 24 * 60 * 60 * 1000;

    return 24 * 60 * 60 * 1000; // 24 horas por defecto
  }
}
