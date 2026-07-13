import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { InteractionReceivedEvent } from '../conversation';

@Injectable()
export class FunnelEngineService {
  private readonly logger = new Logger(FunnelEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verifica si hay un funnel activo o si el mensaje dispara uno nuevo.
   * Retorna una instrucción de sistema si debe inyectarse al KOS.
   */
  async evaluateInteraction(payload: InteractionReceivedEvent): Promise<string | null> {
    const { tenantId, conversationId, content } = payload;

    // 1. Revisar si ya hay un Funnel activo para esta conversación
    const activeFunnel = await this.prisma.activeFunnel.findUnique({
      where: { conversationId },
    });

    if (activeFunnel) {
      this.logger.log(`Funnel activo detectado para conv ${conversationId}`);
      return this.processActiveFunnel(activeFunnel, content);
    }

    // 2. Si no hay activo, revisar si el contenido dispara un Funnel (por trigger)
    const funnels = await this.prisma.funnel.findMany({
      where: { tenantId, isActive: true }
    });

    for (const funnel of funnels) {
      // Lógica de trigger muy básica para MVP (Keyword matching)
      // En el futuro, esto puede ser evaluado por NLP o Regex complejos
      if (funnel.trigger && content.toLowerCase().includes(funnel.trigger.toLowerCase())) {
        this.logger.log(`Nuevo Funnel disparado: ${funnel.name}`);
        
        // Asignamos el primer paso
        const steps = funnel.steps as any[];
        if (steps && steps.length > 0) {
          const firstStep = steps[0];
          
          await this.prisma.activeFunnel.create({
            data: {
              conversationId,
              funnelId: funnel.id,
              currentStepId: firstStep.id || 'step-1'
            }
          });

          return `[INSTRUCCIÓN DE FUNNEL - ALTA PRIORIDAD]: Acabas de entrar al funnel "${funnel.name}". Debes ejecutar el siguiente paso: ${firstStep.instruction || firstStep.name}.`;
        }
      }
    }

    // 3. No hay funnel, el Agente Universal actúa libremente
    return null;
  }

  private async processActiveFunnel(activeFunnel: any, content: string): Promise<string> {
    // Aquí iría la lógica de transición entre nodos de React Flow guardados en DB.
    // Por ahora, solo inyectamos que el funnel está corriendo para que el LLM sepa qué hacer.
    // Una implementación completa leería el estado, validaría si el paso actual se completó, y avanzaría al siguiente.
    return `[INSTRUCCIÓN DE FUNNEL - ALTA PRIORIDAD]: Estás en un proceso guiado (Funnel ID: ${activeFunnel.funnelId}, Paso actual: ${activeFunnel.currentStepId}). Sigue las reglas del embudo y no te desvíes hasta completarlo.`;
  }
}
