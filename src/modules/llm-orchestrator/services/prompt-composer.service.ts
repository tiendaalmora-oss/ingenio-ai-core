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
    let finalSystemContent = `${systemInstructions}\n${memoryContext}${summaryContext}${goalContext}${skillsContext}\n[REGLAS GENERALES DE VENTA Y ENRUTAMIENTO COMERCIAL]:
- Responde siempre de forma clara, concisa, persuasiva y en español natural (tono WhatsApp amigable, educado y directo).
- No envíes respuestas interminables ni repitas información en bucle.
- Actúa estrictamente de acuerdo a tu base de conocimiento KOS. No inventes datos ni precios que no estén en tu configuración.

[REGLAS ESTRICTAS ANTI-BUCLE Y PROGRESIÓN COMERCIAL]:
1. NUNCA REPETIR EL REGALO NI MENSAJES YA ENVIADOS:
   - Revisa el historial de la conversación antes de responder.
   - Si en algún mensaje anterior ya entregaste el "REGALO ESPECIAL" o enlace de cortesía (ej: enlace a sistema de notas o muestra gratuita), NUNCA lo vuelvas a enviar ni repitas la misma presentación.
   - Si el usuario dice respuestas cortas o afirmativas (ej: "Si gracias", "Si adelante", "Ok", "Cuéntame más", "Me interesa", "Dale"):
     * NUNCA repitas el mensaje o pregunta anterior.
     * Avanza de inmediato al siguiente paso del embudo: Explica qué incluye el kit, su precio de oferta (7.250 Bs) y cómo adquirirlo.

2. ENRUTAMIENTO Y CLASIFICACIÓN DE PROSPECTOS MULTI-PRODUCTO:
   - Saludos generales: Pregunta la materia sin asumir Matemática.
   - Mensajes específicos de inicio: Entra directo al producto solicitado.
   - Si el cliente pregunta por otra materia (ej: "Y física"):
     * NUNCA reinicies el embudo desde el regalo gratuito ni preguntes lo mismo.
     * Explica qué contiene el kit de Física y ofrece de inmediato la oportunidad de llevar el COMBO DÚO (Matemática + Física por 12.000 Bs en lugar de 14.500 Bs).
     * Pregúntale si prefiere solo Física o si aprovecha el Combo de ambas materias.

3. COMPRENSIÓN TOTAL Y FLEXIBILIDAD ANTE CUALQUIER MENSAJE:
   - NUNCA te quedes en silencio ni te paralices ante respuestas breves o naturales del usuario (ej: "5 de bachillerato", "5to año", "1ero a 5to", "tengo varias secciones", "quiero el kit de matemática", "pasa precio", "me interesa").
   - Cuando el usuario responda qué año o sección atiende (ej: "5 de bachillerato"):
     * Valida de inmediato su respuesta con entusiasmo (ej: "¡Excelente, profe! Justamente para 5to año de bachillerato contamos con todas las evaluaciones resueltas y planificaciones listas...").
     * Continúa fluidamente explicando el contenido del kit y avanzando hacia el precio de oferta (7.250 Bs) o datos de pago.
   - Si el usuario dice directamente "quiero el kit" o "estoy interesado":
     * Dale la bienvenida a la compra, confirma el Mega Kit seleccionado, el precio promocional y ofrécele los métodos de pago (Pago Móvil / Transferencia).
   - OBLIGATORIO: Cada mensaje del usuario DEBE recibir una respuesta conversacional completa, amigable y persuasiva, terminando con una pregunta de cierre.\n${toolInstructions}`;

    if (mode === PromptMode.FOLLOW_UP) {
      const followUpContext = `\n[MODO: SEGUIMIENTO AUTOMÁTICO ACTIVO (FOLLOW_UP)]\nEstás enviando un mensaje de seguimiento proactivo para reactivar la conversación.\nRegla de seguimiento aplicada: ${JSON.stringify(followUpRule)}\nEl usuario no ha respondido recientemente. Tú estás retomando el contacto amablemente según la regla. Menciona el producto que le interesaba si lo conoces, resuelve dudas y anímalo a continuar.\n`;
      finalSystemContent += followUpContext;
    }

    const messages: any[] = [{
      role: 'system',
      content: finalSystemContent
    }];
    
    // 7. Build History
    messages.push(...this.buildHistory(history));

    // 8. Add Current Message or Follow-Up trigger
    if (mode === PromptMode.FOLLOW_UP) {
      const ruleText = typeof followUpRule === 'string' 
        ? followUpRule 
        : (followUpRule?.instruccion || followUpRule?.condicion || followUpRule?.mensaje || followUpRule?.tiempo || 'Retomar contacto amablemente');
      
      messages.push({
        role: 'user',
        content: `[INSTRUCCIÓN DE SEGUIMIENTO AUTOMÁTICO]: El cliente lleva un tiempo sin responder. Redacta un mensaje de WhatsApp corto, amable y persuasivo aplicando esta pauta: "${ruleText}". Menciona su nombre o el producto de interés si lo conoces, y hazle una pregunta clara para continuar la conversación.`
      });
    } else if (currentMessage) {
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
    let result = '[CONOCIMIENTO DEL NEGOCIO Y PRODUCTOS (KOS)]\n';
    if (!kosBundle) return result;
    
    for (const [key, value] of Object.entries(kosBundle)) {
      if (!value) continue;
      if (typeof value === 'string') {
        result += `### ${key.toUpperCase()}:\n${value}\n\n`;
      } else if (Array.isArray(value)) {
        if (value.length > 0) {
          result += `### ${key.toUpperCase()}:\n`;
          value.forEach((item, idx) => {
            if (typeof item === 'string') {
              result += `- ${item}\n`;
            } else if (typeof item === 'object') {
              result += `- Item ${idx + 1}: ${Object.entries(item).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' | ')}\n`;
            }
          });
          result += '\n';
        }
      } else if (typeof value === 'object') {
        result += `### ${key.toUpperCase()}:\n`;
        for (const [subK, subV] of Object.entries(value)) {
          if (subV) {
            if (typeof subV === 'string') {
              result += `  * ${subK}: ${subV}\n`;
            } else if (Array.isArray(subV)) {
              if (subV.length > 0) {
                result += `  * ${subK}:\n`;
                subV.forEach((sv, i) => {
                  result += `    - ${typeof sv === 'object' ? JSON.stringify(sv) : sv}\n`;
                });
              }
            } else if (typeof subV === 'object') {
              result += `  * ${subK}: ${JSON.stringify(subV)}\n`;
            }
          }
        }
        result += '\n';
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
[INSTRUCCIONES DE TOOLS - ETIQUETADO Y CRM AUTOMÁTICO]:
Tienes acceso a herramientas esenciales que DEBES usar proactivamente:
- update_business_memory: Llama a esta herramienta OBLIGATORIAMENTE para mantener el CRM actualizado:
  * interests: Agrega el nombre del producto o kit consultado (ej: ["Mega Kit Matemática"] o ["Mega Kit Física"]).
  * leadStatus: Clasifica el estado de venta:
      - "COLD": Primer contacto o curiosidad general.
      - "WARM": Pregunta por características, beneficios o precios.
      - "HOT": Pide datos de pago, transferencia o dice "quiero el kit".
      - "CLOSED": Pago reportado / venta concretada.
  * tags: Asigna etiquetas automáticas según lo que ocurra: ["INTERESADO_MATEMATICA", "INTERESADO_FISICA", "PIDIO_PRECIO", "PIDIO_DATOS_PAGO", "PAGO_CONFIRMADO", "DUDAS_MATERIAL", etc.].
  * name, company, objections: Extrae el nombre del cliente y cualquier objeción o duda.
- create_task: Para tareas o recordatorios internos.
- schedule_meeting: Solo cuando el cliente acepte expresamente una reunión.
- handoff_to_human: Cuando el usuario pida explícitamente ser atendido por una persona.

IMPORTANTE: Antes de enviar la respuesta final, si detectas nuevos datos, interés en un producto o cambio de estado de compra, llama a update_business_memory para etiquetar al cliente.`;
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
