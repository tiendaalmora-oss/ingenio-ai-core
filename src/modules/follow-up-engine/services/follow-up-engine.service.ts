import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../shared/database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class FollowUpEngineService {
  private readonly logger = new Logger(FollowUpEngineService.name);

  // Ventana horaria de atención respetuosa (7:00 AM a 11:59 PM)
  private readonly DEFAULT_START_HOUR = 7;
  private readonly DEFAULT_END_HOUR = 24;

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async evaluateFollowUps() {
    const now = new Date();
    const report: any = {
      timestamp: now.toISOString(),
      isWindowAllowed: false,
      activeConversationsFound: 0,
      evaluatedTenants: [],
      dispatched: [],
      skipped: [],
    };

    // 1. Validar ventana horaria de atención (7 AM a 12 AM medianoche)
    const allowed = this.isWithinAllowedWindow(now, this.DEFAULT_START_HOUR, this.DEFAULT_END_HOUR);
    report.isWindowAllowed = allowed;

    if (!allowed) {
      this.logger.debug(`[FollowUpEngine] Fuera de ventana horaria (${this.DEFAULT_START_HOUR}:00 - ${this.DEFAULT_END_HOUR}:00).`);
      return report;
    }

    // 2. Buscar todas las conversaciones activas
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

    report.activeConversationsFound = activeConversations.length;

    if (!activeConversations.length) {
      return report;
    }

    const tenantIds = [...new Set(activeConversations.map(c => c.contact.tenantId))];

    for (const tenantId of tenantIds) {
      const bundle = await this.prisma.knowledgeBundle.findUnique({
        where: { tenantId }
      });

      if (!bundle) {
        report.skipped.push({ tenantId, reason: 'No KnowledgeBundle found' });
        continue;
      }
      
      const systemPrompt: any = bundle.systemPrompt || {};
      const rawData: any = typeof systemPrompt === 'string' ? JSON.parse(systemPrompt) : (systemPrompt['_raw'] || systemPrompt);
      const rawSeguimientos = rawData['seguimientos'] || rawData['followups'] || systemPrompt['followups'] || systemPrompt['seguimientos'] || rawData['scriptsComerciales'];

      // Extraer reglas universales (acepta texto natural, arrays, u objetos)
      const rules = this.extractFollowUpRules(rawSeguimientos);
      if (!rules.length) {
        report.skipped.push({ tenantId, reason: 'No follow-up rules configured or parsed' });
        continue;
      }

      // Ordenar reglas por tiempo de menor a mayor (ej: 5 min antes de 1 hora)
      const sortedRules = [...rules].sort((a, b) => this.parseDelayMs(a) - this.parseDelayMs(b));

      const tenantConvos = activeConversations.filter(c => c.contact.tenantId === tenantId);
      report.evaluatedTenants.push({
        tenantId,
        rulesCount: sortedRules.length,
        conversationsCount: tenantConvos.length
      });

      for (const convo of tenantConvos) {
        // No enviar seguimientos si la venta ya está cerrada o pagada
        const leadStatus = (convo.contact.memory?.leadStatus || '').toUpperCase();
        if (leadStatus === 'CLOSED' || leadStatus === 'PAGADO') {
          report.skipped.push({ conversationId: convo.id, contact: convo.contact.phone, reason: `Lead status is ${leadStatus}` });
          continue;
        }

        const lastInteraction = convo.interactions.length > 0 ? convo.interactions[0] : null;
        if (!lastInteraction) {
          report.skipped.push({ conversationId: convo.id, contact: convo.contact.phone, reason: 'No interactions found' });
          continue;
        }

        const timeSinceLastInteraction = Date.now() - lastInteraction.timestamp.getTime();
        const elapsedMinutes = Math.round(timeSinceLastInteraction / 60000);

        for (const rule of sortedRules) {
          const delayMs = this.parseDelayMs(rule);

          if (timeSinceLastInteraction >= delayMs) {
            const ruleIdentifier = rule.id || `rule-${(rule.tiempo || 'default').replace(/\s+/g, '')}-${delayMs}`;

            // Evitar duplicar el mismo seguimiento en las últimas 24 horas si ya está encolado, procesando o enviado
            const alreadyDispatched = await this.prisma.pendingOutboundMessage.findFirst({
              where: {
                conversationId: convo.id,
                followUpId: ruleIdentifier,
                status: { in: ['PENDING', 'PROCESSING', 'SENT'] },
                createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
              }
            });

            if (alreadyDispatched) {
              report.skipped.push({ conversationId: convo.id, contact: convo.contact.phone, rule: ruleIdentifier, reason: `Already dispatched with status ${alreadyDispatched.status}` });
              continue;
            }

            const payload = {
              tenantId: tenantId,
              conversationId: convo.id,
              contactId: convo.contactId,
              followUpId: ruleIdentifier,
              ruleApplied: rule,
              timestamp: new Date()
            };
            
            this.logger.log(`[FollowUpEngine] 🚀 Disparando seguimiento para ${convo.contact.name || convo.contact.phone || convo.contactId} (inactivo hace ${elapsedMinutes} min), regla: "${rule.tiempo || ruleIdentifier}"`);
            
            this.eventEmitter.emit('FOLLOW_UP_PENDING', payload);
            
            report.dispatched.push({
              conversationId: convo.id,
              contact: convo.contact.phone || convo.contactId,
              rule: rule.tiempo || ruleIdentifier,
              elapsedMinutes
            });

            // Evaluamos solo la regla prioritaria actual para no saturar al cliente
            break;
          }
        }
      }
    }

    return report;
  }

  /**
   * Extrae y normaliza las reglas de seguimiento desde cualquier formato (Texto natural de Business Studio, Array, u Objeto).
   */
  private extractFollowUpRules(raw: any): any[] {
    if (!raw) return [];

    // Caso 1: Array
    if (Array.isArray(raw)) {
      return raw.map((item, idx) => {
        if (typeof item === 'string') {
          return { id: `rule-${idx}`, tiempo: item, condicion: item, instruccion: item };
        }
        return item;
      });
    }

    // Caso 2: Objeto con lista anidada o texto
    if (typeof raw === 'object') {
      if (Array.isArray(raw.reglas)) return this.extractFollowUpRules(raw.reglas);
      if (Array.isArray(raw.items)) return this.extractFollowUpRules(raw.items);
      if (typeof raw.text === 'string') return this.extractFollowUpRules(raw.text);
      if (typeof raw.prompt === 'string') return this.extractFollowUpRules(raw.prompt);
    }

    // Caso 3: Texto en lenguaje natural (escrito en Business Studio)
    if (typeof raw === 'string') {
      const text = raw.trim();
      if (!text) return [];

      const lines = text
        .split(/\n+/)
        .map(l => l.trim())
        .filter(l => l.length > 0 && !l.startsWith('#'));

      const rules: any[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Buscar menciones de tiempo (ej: '5 min', '5 minutos', '1 hora', '24 horas', '1 dia')
        const timeMatch = line.match(/(\d+)\s*(?:minutos?|mins?|m\b|horas?|hrs?|h\b|d[ií]as?|d\b)/i);
        if (timeMatch) {
          rules.push({
            id: `rule-text-${i}-${timeMatch[0].replace(/\s+/g, '')}`,
            tiempo: timeMatch[0],
            condicion: line,
            instruccion: line,
            nombre: `Seguimiento (${timeMatch[0]})`
          });
        }
      }

      if (rules.length > 0) return rules;

      // Si escribió texto continuo sin viñetas con minutos/horas, asignamos reglas estándar
      return [
        { id: 'rule-auto-5m', tiempo: '5 minutos', condicion: text, instruccion: text, nombre: 'Seguimiento 5 min' },
        { id: 'rule-auto-1h', tiempo: '1 hora', condicion: text, instruccion: text, nombre: 'Seguimiento 1 hora' }
      ];
    }

    return [];
  }

  /**
   * Comprueba si la hora actual está dentro de la ventana de atención respetuosa (UTC-4 / Caracas).
   */
  private isWithinAllowedWindow(now: Date, startHour: number, endHour: number): boolean {
    try {
      const hourStr = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        hour12: false,
        timeZone: 'America/Caracas',
      }).format(now);
      const localHour = parseInt(hourStr, 10);
      if (isNaN(localHour)) return true;
      return localHour >= startHour && localHour < endHour;
    } catch {
      const currentHour = now.getHours();
      return currentHour >= startHour && currentHour < endHour;
    }
  }

  /**
   * Interpreta cadenas de tiempo en lenguaje natural como '5 min', '5 minutos', '1 hora', '24h', '1 día'.
   */
  private parseDelayMs(rule: any): number {
    if (rule.delayHours && !isNaN(Number(rule.delayHours))) {
      return Number(rule.delayHours) * 60 * 60 * 1000;
    }
    if (rule.delayMinutes && !isNaN(Number(rule.delayMinutes))) {
      return Number(rule.delayMinutes) * 60 * 1000;
    }

    const text = `${rule.tiempo || ''} ${rule.condition || ''} ${rule.condicion || ''} ${rule.nombre || ''} ${rule.instruccion || ''}`.toLowerCase();
    
    // Minutos: '5 min', '5 minutos', '30m', '10 mins'
    const minMatch = text.match(/(\d+)\s*(?:m|min|minuto|minutos|mins)\b/);
    if (minMatch) return parseInt(minMatch[1], 10) * 60 * 1000;

    // Horas: '1 hora', '2 horas', '24h', '1h', '2 hrs'
    const hoursMatch = text.match(/(\d+)\s*(?:h|hora|horas|hr|hrs)\b/);
    if (hoursMatch) return parseInt(hoursMatch[1], 10) * 60 * 60 * 1000;
    
    // Días: '1 dia', '2 días', '1d'
    const daysMatch = text.match(/(\d+)\s*(?:d|dia|dias|día|días)\b/);
    if (daysMatch) return parseInt(daysMatch[1], 10) * 24 * 60 * 60 * 1000;

    // Si solo hay un número
    const numMatch = text.match(/\b(\d+)\b/);
    if (numMatch) {
      const val = parseInt(numMatch[1], 10);
      return val <= 10 ? val * 60 * 1000 : val * 60 * 60 * 1000;
    }

    return 5 * 60 * 1000; // 5 minutos por defecto
  }
}
