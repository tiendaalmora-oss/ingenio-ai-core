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
   - OBLIGATORIO: Cada mensaje del usuario DEBE recibir una respuesta conversacional completa, amigable y persuasiva, terminando con una pregunta de cierre.

4. DETECCIÓN DE COMPROBANTES DE PAGO Y NOTAS DE VOZ:
   - Si el mensaje contiene '[Comprobante de Pago Detectado]' Y especifica datos bancarios (Banco, Referencia, Monto):
     * Llama a update_business_memory para clasificar al lead como leadStatus: 'CLOSED' y agregar la etiqueta 'PAGO_CONFIRMADO'.
     * Felicita al cliente con alegría por unirse y adquirir su Mega Kit.
     * Confirma los datos del comprobante recibido (Banco, Referencia, Monto).
     * Proporciónale de inmediato las instrucciones de acceso y descarga de su material pedagógico.
   - Si el mensaje describe una FOTO O IMAGEN GENERAL que NO es un comprobante (ej: foto personal, rostro, meme, duda):
     * NUNCA digas que recibiste un comprobante de pago ni felicites por una compra que no existe.
     * Responde amablemente al contexto de la imagen (ej: saludando cordialmente o resolviendo la duda).
   - Si el mensaje contiene '[Nota de voz del usuario]':
     * Responde con total naturalidad al contenido de lo que dijo el usuario en el audio.

5. ATENCIÓN POST-VENTA Y CLIENTE QUE YA COMPRÓ (NUNCA REINICIAR EL EMBUDO):
   - Revisa el historial y la memoria. Si el cliente ya pagó o compró anteriormente (leadStatus: 'CLOSED' o etiqueta 'PAGO_CONFIRMADO'):
     * NUNCA le vuelvas a enviar el mensaje de bienvenida ni le preguntes de qué año busca material para venderle lo mismo.
     * Trátalo como CLIENTE ACTIVO / VIP: ayúdalo con el acceso a sus materiales, descargas o dudas pedagógicas.
     * Si desea adquirir una materia adicional (ej: compró Matemática y ahora pregunta por Física), dale la bienvenida al segundo kit con el precio preferencial.

6. SOLICITUD DE ASESOR HUMANO Y RECHAZO / OPT-OUT (PAUSA AUTOMÁTICA):
   - Si el cliente solicita hablar con un humano, asesor o persona real (ej: "quiero hablar con una persona", "pásame con un asesor", "¿hay alguien real?", "humano"):
     * Llama de inmediato a la herramienta pause_bot_and_handoff con reason: 'HUMAN_REQUESTED' y leadStatus: 'HANDOFF'.
     * Redacta una respuesta amable confirmando que un asesor humano de nuestro equipo tomará la conversación en breve.
   - Si el cliente indica que no le interesa la oferta, pide cancelar o no recibir más mensajes (ej: "no me interesa", "no gracias", "no me escriban más", "cancelar"):
     * Llama de inmediato a la herramienta pause_bot_and_handoff con reason: 'NOT_INTERESTED' y leadStatus: 'LOST'.
     * Redacta una respuesta educada y respetuosa agradeciéndole por su tiempo y deseándole un excelente día.\n${toolInstructions}`;

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
Tienes acceso a herramientas esenciales que puedes usar para registrar datos en el CRM:
- update_business_memory: Úsala para registrar intereses del cliente, etiquetas o su nivel de avance en la compra:
  * interests: Agrega el nombre del producto o kit consultado (ej: ["Mega Kit Matemática"] o ["Mega Kit Física"]).
  * leadStatus: Clasifica el estado de venta ("COLD", "WARM", "HOT", "CLOSED").
  * tags: Etiquetas relevantes (ej: ["INTERESADO_MATEMATICA", "INTERESADO_FISICA", "3RO_ANO", "4TO_ANO", "5TO_ANO", "PIDIO_PRECIO", etc.]).
  * name, company, objections: Datos adicionales relevantes.
- create_task: Para tareas o recordatorios internos.
- schedule_meeting: Solo cuando el cliente acepte expresamente una reunión.
- handoff_to_human: Cuando el usuario pida explícitamente ser atendido por un asesor humano.

REGLA OBLIGATORIA: Siempre debes responder de forma amable, profesional y persuasiva al mensaje del usuario en lenguaje natural. Nunca dejes al usuario sin respuesta.`;
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
