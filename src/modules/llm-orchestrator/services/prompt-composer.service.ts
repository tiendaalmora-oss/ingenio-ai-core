import { Injectable } from '@nestjs/common';
import { BusinessMemory, Interaction } from '@prisma/client';

export enum PromptMode {
  NORMAL = 'NORMAL',
  FOLLOW_UP = 'FOLLOW_UP'
}

export interface PromptComposerInput {
  kosBundle: any;
  memory: BusinessMemory | null;
  history: Interaction[];
  conversationSummary?: string | null;
  activeGoal?: string | null;
  availableSkills?: string[];
  currentMessage?: string | null;
  mode?: PromptMode;
  followUpRule?: any;
}

@Injectable()
export class PromptComposerService {
  
  compose(input: PromptComposerInput): any[] {
    const { kosBundle, memory, history, conversationSummary, activeGoal, availableSkills, currentMessage, mode, followUpRule } = input;
    
    // 1. Build System Instructions
    const systemInstructions = this.buildSystemKOS(kosBundle);
    
    // 2. Build Business Memory
    const memoryContext = this.buildMemoryContext(memory);

    // 3. Build Summary & Goal Context
    const summaryContext = conversationSummary ? `\n[RESUMEN DE CONVERSACIÓN]\n${conversationSummary}\n` : '';
    const goalContext = activeGoal ? `\n[OBJETIVO ACTIVO]\n${activeGoal}\n` : '';
    
    // 4. Build Skills
    const skillsContext = availableSkills && availableSkills.length > 0 
      ? `\n[SKILLS DISPONIBLES]\n${availableSkills.join(', ')}\n` 
      : '';
    
    // 5. Build Tool Instructions
    const toolInstructions = this.buildToolInstructions();
    
    // 6. Combine System Message
    let finalSystemContent = `${systemInstructions}\n${memoryContext}${summaryContext}${goalContext}${skillsContext}\n[REGLAS GENERALES]\nActúa de acuerdo a las instrucciones del KOS. No inventes información que no esté en tu configuración.\n${toolInstructions}`;
    
    if (mode === PromptMode.FOLLOW_UP) {
      const followUpContext = `\n[MODO: FOLLOW_UP]\nEstás enviando un mensaje de seguimiento proactivo para reactivar la conversación.\nRegla de seguimiento aplicada: ${JSON.stringify(followUpRule)}\nEl usuario NO te ha hablado recientemente. Tú estás iniciando el contacto ahora mismo basándote en la regla anterior. Sé natural, amable, y ve directo al punto según la regla.\n`;
      finalSystemContent += followUpContext;
    }

    const messages: any[] = [{
      role: 'system',
      content: finalSystemContent
    }];
    
    // 7. Build History
    messages.push(...this.buildHistory(history));

    // 8. Add Current Message if not in history
    // Since history usually already contains the incoming message in our DB, we check if it's provided separately.
    // If we need to explicitly append it (depending on how the controller/listener is set up), we do it here.
    if (currentMessage) {
       // Only append if it's not the last message in history
       const lastMsg = history.length > 0 ? history[history.length - 1] : null;
       if (!lastMsg || lastMsg.content !== currentMessage) {
           messages.push({
               role: 'user',
               content: currentMessage
           });
       }
    }
    
    return messages;
  }
  
  private buildSystemKOS(kosBundle: any): string {
    let result = '[SYSTEM KOS]\n';
    if (!kosBundle) return result;
    
    for (const [key, value] of Object.entries(kosBundle)) {
      if (typeof value === 'object') {
        result += `- ${key.toUpperCase()}: ${JSON.stringify(value)}\n`;
      } else {
        result += `- ${key.toUpperCase()}: ${value}\n`;
      }
    }
    return result;
  }
  
  private buildMemoryContext(memory: BusinessMemory | null): string {
    if (!memory) return '[BUSINESS MEMORY]: Ninguna memoria previa detectada.';
    
    return `[BUSINESS MEMORY]:
- Nombre: ${memory.name || 'Desconocido'}
- Empresa: ${memory.company || 'Desconocida'}
- Intereses: ${memory.interests?.join(', ') || 'Ninguno'}
- Última interacción: ${memory.lastInteraction ? memory.lastInteraction.toISOString() : 'Desconocida'}
- Estado del Lead: ${memory.leadStatus || 'Desconocido'}
- Objeciones: ${memory.objections?.join(', ') || 'Ninguna'}
- Tags: ${memory.tags?.join(', ') || 'Ninguno'}`;
  }
  
  private buildToolInstructions(): string {
    return `
[INSTRUCCIONES DE TOOLS - OBLIGATORIO]:
Tienes acceso a herramientas que DEBES usar en estas situaciones:
- update_business_memory: Llama a esta tool SIEMPRE que el usuario mencione su nombre, empresa, tipo de negocio, intereses, productos que busca, problemas actuales, tamaño del negocio (ej. cantidad de cajas, sucursales), o cualquier dato relevante del lead. Es fundamental para actualizar el CRM automáticamente. DEBES extraer CADA fragmento de información nueva en llamadas separadas o unificadas.
- create_task: Úsala cuando necesites recordarte a ti mismo hacer un seguimiento interno.
- schedule_meeting: Úsala EXCLUSIVAMENTE cuando el cliente acepte de forma explícita tener una demostración o reunión.
- handoff_to_human: Úsala cuando el usuario pida hablar con una persona humana o la situación lo requiera.

IMPORTANTE: Si el usuario menciona cualquier dato de su negocio (empresa, rubro, cantidad de cajas, herramientas que usa, problemas, necesidades), PRIMERO llama a update_business_memory obligatoriamente con esa información antes de responder.`;
  }
  
  private buildHistory(history: Interaction[]): any[] {
    const messages: any[] = [];
    for (const msg of history) {
      if (msg.role === 'tool') {
        messages.push({ role: 'tool', content: msg.content, tool_call_id: msg.toolCallId });
      } else if (msg.role === 'assistant' && msg.toolCalls) {
        const toolCallsArr = Array.isArray(msg.toolCalls) ? msg.toolCalls : [];
        messages.push({
          role: 'assistant',
          content: null,
          tool_calls: toolCallsArr.map((tc: any) => ({
            id: tc.id,
            type: 'function',
            function: { name: tc.name, arguments: JSON.stringify(tc.arguments ?? {}) }
          }))
        });
      } else {
        messages.push({
          role: msg.role || (msg.direction === 'INBOUND' ? 'user' : 'assistant'),
          content: msg.content
        });
      }
    }
    return messages;
  }
}
