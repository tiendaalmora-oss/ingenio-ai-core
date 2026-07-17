import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { KosLoaderService } from './kos-loader.service';

@Injectable()
export class ContextBuilderService {
  private readonly logger = new Logger(ContextBuilderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kosLoader: KosLoaderService
  ) {}

  async buildContext(
    tenantId: string, 
    contactId: string, 
    conversationId: string, 
    content: string,
    funnelInstruction: string | null = null
  ): Promise<any[]> {
    // 1. Obtener KOS Bundle del tenant dinámicamente
    const kosBundle = await this.kosLoader.load(tenantId);
    
    // Convertir el JSON bundle en un system prompt estructurado
    let systemInstructions = `[SYSTEM KOS]\n`;
    for (const [key, value] of Object.entries(kosBundle)) {
      if (typeof value === 'object') {
        systemInstructions += `- ${key.toUpperCase()}: ${JSON.stringify(value)}\n`;
      } else {
        systemInstructions += `- ${key.toUpperCase()}: ${value}\n`;
      }
    }

    if (funnelInstruction) {
      systemInstructions += `\n\n${funnelInstruction}\n\n`;
    }

    // 2. Obtener Business Memory del contacto
    const memory = await this.prisma.businessMemory.findUnique({
      where: { contactId },
    });

    let memoryContext = '[BUSINESS MEMORY]: Ninguna memoria previa detectada.';
    if (memory) {
      memoryContext = `[BUSINESS MEMORY]:
- Nombre: ${memory.name || 'Desconocido'}
- Empresa: ${memory.company || 'Desconocida'}
- Intereses: ${memory.interests.join(', ') || 'Ninguno'}
- Última interacción: ${memory.lastInteraction ? memory.lastInteraction.toISOString() : 'Desconocida'}
- Estado del Lead: ${memory.leadStatus || 'Desconocido'}
- Objeciones: ${memory.objections.join(', ') || 'Ninguna'}
- Tags: ${memory.tags.join(', ') || 'Ninguno'}`;
      this.logger.log(`Business Memory recuperada para el contacto ${contactId}.`);
    } else {
      this.logger.log(`No se encontró Business Memory para el contacto ${contactId}. Procediendo en blanco.`);
    }

    // 3. Obtener Historial de Conversación (últimos 10 mensajes)
    const rawHistory = await this.prisma.interaction.findMany({
      where: { conversationId },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });
    
    // Invertir para mantener orden cronológico
    const history = rawHistory.reverse();

    // 4. Construir Arreglo de Mensajes (OpenAI Compatible)
    const toolInstructions = `
[INSTRUCCIONES DE TOOLS - OBLIGATORIO]:
Tienes acceso a herramientas que DEBES usar en estas situaciones:
- update_business_memory: Llama a esta tool SIEMPRE que el usuario mencione su nombre, empresa, tipo de negocio, intereses, productos que busca, problemas actuales, tamaño del negocio (ej. cantidad de cajas, sucursales), o cualquier dato relevante del lead. Es fundamental para actualizar el CRM automáticamente. DEBES extraer CADA fragmento de información nueva en llamadas separadas o unificadas.
- create_task: Úsala cuando el usuario solicite una demo, reunión, llamada o seguimiento.
- handoff_to_human: Úsala cuando el usuario pida hablar con una persona humana o la situación lo requiera.

IMPORTANTE: Si el usuario menciona cualquier dato de su negocio (empresa, rubro, cantidad de cajas, herramientas que usa, problemas, necesidades), PRIMERO llama a update_business_memory obligatoriamente con esa información antes de responder.`;

    const messages: any[] = [
      {
        role: "system",
        content: `${systemInstructions}\n\n${memoryContext}\n\nActúa de acuerdo a las instrucciones del KOS. No inventes información que no esté en tu configuración.${toolInstructions}`
      }
    ];

    // Añadir el historial
    for (const msg of history) {
      if (msg.role === 'tool') {
        messages.push({ role: 'tool', content: msg.content, tool_call_id: msg.toolCallId });
      } else if (msg.role === 'assistant' && msg.toolCalls) {
        // Tool call message: content must be null (not empty string) for Google compatibility
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
