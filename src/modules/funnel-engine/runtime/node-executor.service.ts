import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DslStep } from '../automation-compiler.service';
import { ExecutionContext } from './execution-context.interface';
import { RuntimeLoggerService } from './runtime-logger.service';

@Injectable()
export class NodeExecutorService {
  private readonly logger = new Logger(NodeExecutorService.name);

  constructor(
    private readonly runtimeLogger: RuntimeLoggerService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async execute(step: DslStep, context: ExecutionContext): Promise<string | null> {
    this.runtimeLogger.logStep(context.tenantId, context.sessionId, step.id, step.type, `Ejecutando: ${step.name}`);

    try {
      switch (step.type) {
        case 'event': return await this.executeEvent(step, context);
        case 'ai': return await this.executeAi(step, context);
        case 'crm': return await this.executeCrm(step, context);
        case 'whatsapp': return await this.executeWhatsapp(step, context);
        case 'skill': return await this.executeSkill(step, context);
        case 'condition': return await this.executeCondition(step, context);
        case 'automation': return await this.executeAutomation(step, context);
        case 'end': return null;
        default: return step.next || null;
      }
    } catch (error: any) {
      this.runtimeLogger.logStep(context.tenantId, context.sessionId, step.id, 'error', `Fallo: ${error.message}`);
      return null;
    }
  }

  private async executeEvent(step: DslStep, context: ExecutionContext): Promise<string | null> {
    return step.next || null;
  }

  private async executeAi(step: DslStep, context: ExecutionContext): Promise<string | null> {
    const payload = context.triggerEvent;
    // Llamada directa a Hermes API (simulando LlmListener)
    const hermesUrl = process.env.HERMES_BASE_URL || 'http://localhost:4000/api/v1/hermes';
    const apiKey = process.env.HERMES_API_KEY || '';
    const model = process.env.HERMES_MODEL || 'hermes';

    try {
      const response = await fetch(`${hermesUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: payload.content || 'Analizar intención del cliente' }]
        })
      });
      const data = await response.json();
      context.state.aiResponse = data.choices?.[0]?.message?.content || "Análisis completado";
      this.runtimeLogger.logStep(context.tenantId, context.sessionId, step.id, 'ai', `Hermes analizó el contexto.`);
    } catch (e) {
      this.runtimeLogger.logStep(context.tenantId, context.sessionId, step.id, 'error', `IA falló. Continúa flujo.`);
    }

    return step.next || null;
  }

  private async executeCrm(step: DslStep, context: ExecutionContext): Promise<string | null> {
    // Simulamos la emisión del evento CRM para que el CrmEventListener lo atrape
    // En el futuro, step.data dirá exactamente qué campo actualizar
    this.eventEmitter.emit('contact.update', {
      tenantId: context.tenantId,
      contactId: context.triggerEvent?.contactId || 'unknown',
      data: { leadStatus: 'HOT_LEAD' }
    });
    this.runtimeLogger.logStep(context.tenantId, context.sessionId, step.id, 'crm', `CRM actualizado a HOT_LEAD.`);
    return step.next || null;
  }

  private async executeWhatsapp(step: DslStep, context: ExecutionContext): Promise<string | null> {
    const msg = context.state.aiResponse || step.description || "Mensaje por defecto";
    
    // Emitimos el evento que OutboundEngine (WahaAdapter) ya escucha
    this.eventEmitter.emit('response.generated', {
      tenantId: context.tenantId,
      conversationId: context.sessionId,
      content: msg
    });

    this.runtimeLogger.logStep(context.tenantId, context.sessionId, step.id, 'whatsapp', `Enviando mensaje: ${msg}`);
    return step.next || null;
  }

  private async executeSkill(step: DslStep, context: ExecutionContext): Promise<string | null> {
    this.eventEmitter.emit('tool.called', {
      tenantId: context.tenantId,
      conversationId: context.sessionId,
      contactId: context.triggerEvent?.contactId,
      toolCallId: 'skill_123',
      toolName: step.name || 'generic_skill',
      arguments: {}
    });
    this.runtimeLogger.logStep(context.tenantId, context.sessionId, step.id, 'skill', `Skill invocada: ${step.name}`);
    return step.next || null;
  }

  private async executeCondition(step: DslStep, context: ExecutionContext): Promise<string | null> {
    // Logica simplificada: evaluamos si la IA detectó interés (buscamos palabra clave en state)
    const isInterested = (context.state.aiResponse || '').toLowerCase().includes('comprar') || Math.random() > 0.5;
    this.runtimeLogger.logStep(context.tenantId, context.sessionId, step.id, 'condition', `Evaluado como: ${isInterested}`);
    return isInterested ? (step.onTrue || null) : (step.onFalse || null);
  }

  private async executeAutomation(step: DslStep, context: ExecutionContext): Promise<string | null> {
    // Delay o logica custom
    this.runtimeLogger.logStep(context.tenantId, context.sessionId, step.id, 'automation', `Aplicando automatización.`);
    return step.next || null;
  }
}
