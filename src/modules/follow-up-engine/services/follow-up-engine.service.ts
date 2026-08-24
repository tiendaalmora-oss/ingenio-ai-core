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
    this.logger.debug('Evaluando oportunidades de seguimiento...');

    // Evaluar únicamente conversaciones ACTIVAS
    const activeConversations = await this.prisma.conversation.findMany({
      where: {
        status: 'ACTIVE'
      },
      include: {
        contact: true,
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
        const lastInteraction = convo.interactions.length > 0 ? convo.interactions[0] : null;
        if (!lastInteraction) continue;

        const timeSinceLastInteraction = Date.now() - lastInteraction.timestamp.getTime();

        for (const rule of seguimientos) {
          // Lógica simplificada de tiempos basados en el KOS para determinar si corresponde
          let delayMs = 24 * 60 * 60 * 1000; // 24h por defecto
          if (rule.delayHours) {
            delayMs = rule.delayHours * 60 * 60 * 1000;
          } else if (typeof rule.condition === 'string') {
            if (rule.condition.includes('24h')) delayMs = 24 * 60 * 60 * 1000;
            else if (rule.condition.includes('48h')) delayMs = 48 * 60 * 60 * 1000;
            else if (rule.condition.includes('1h')) delayMs = 1 * 60 * 60 * 1000;
            else if (rule.condition.includes('min')) delayMs = 5 * 60 * 1000;
          }

          if (timeSinceLastInteraction > delayMs) {
            // Solo generar una acción interna (FOLLOW_UP_PENDING) y publicarla
            const payload = {
              tenantId: tenantId,
              conversationId: convo.id,
              contactId: convo.contactId,
              followUpId: rule.id || `rule-${Math.random().toString(36).substring(2, 9)}`,
              ruleApplied: rule,
              timestamp: new Date()
            };
            
            this.logger.log(`[FollowUpEngine] Oportunidad detectada para contacto ${convo.contactId}, regla: ${payload.followUpId}`);
            
            this.eventEmitter.emit('FOLLOW_UP_PENDING', payload);
            
            // Detenemos evaluación de esta conversación para no saturar con múltiples reglas simultáneas
            break;
          }
        }
      }
    }
  }
}
