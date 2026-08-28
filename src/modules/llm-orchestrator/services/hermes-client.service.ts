import { Injectable, Logger, Inject } from '@nestjs/common';
import { IAiProvider } from '../providers/ai-provider.interface';
import type { AiMessage, AiResponse } from '../providers/ai-provider.interface';
import { AI_PROVIDER_TOKEN } from '../providers/ai-provider.factory';

// Herramientas disponibles para el Agente Universal
const HERMES_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'update_business_memory',
      description: 'Actualiza la memoria del lead en el CRM con información detectada en la conversación. Úsala siempre que el cliente mencione su empresa, intereses, objeciones, o cualquier dato relevante.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nombre completo del contacto' },
          company: { type: 'string', description: 'Nombre de la empresa o negocio' },
          interests: { type: 'array', items: { type: 'string' }, description: 'Productos o servicios de interés' },
          objections: { type: 'array', items: { type: 'string' }, description: 'Objeciones o preocupaciones expresadas' },
          leadStatus: { type: 'string', enum: ['NEW', 'CONTACTED', 'WARM', 'HOT', 'DEMO', 'OFFER', 'SALE', 'CLIENT'], description: 'Estado actual del lead' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Etiquetas relevantes' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_task',
      description: 'Crea una tarea de seguimiento en el CRM para este contacto.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Descripción de la tarea' },
          dueDate: { type: 'string', description: 'Fecha de vencimiento en formato ISO 8601' },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'handoff_to_human',
      description: 'Transfiere la conversación a un agente humano cuando el cliente lo solicita explícitamente.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Motivo del traspaso (ej: "Cliente solicitó hablar con un asesor humano")' },
        },
        required: ['reason'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'pause_bot_and_handoff',
      description: 'Pausa el bot de inmediato y cancela todos los mensajes de seguimiento cuando el cliente solicita un asesor humano o expresa desinterés total (opt-out).',
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            enum: ['HUMAN_REQUESTED', 'NOT_INTERESTED', 'MANUAL_PAUSE'],
            description: 'Razón de la pausa: HUMAN_REQUESTED si pidió hablar con una persona o asesor, NOT_INTERESTED si no le interesa la oferta o pide no recibir más mensajes.',
          },
          closingMessage: {
            type: 'string',
            description: 'Mensaje cordial de confirmación de transferencia humana o despedida que se enviará al usuario por WhatsApp.',
          },
          leadStatus: {
            type: 'string',
            enum: ['HANDOFF', 'LOST'],
            description: 'Nuevo estado del lead en CRM: HANDOFF para atención humana, LOST para no interesado.',
          },
        },
        required: ['reason', 'closingMessage'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'schedule_meeting',
      description: 'Agenda una demo o reunión de ventas con el cliente. Úsala cuando el cliente acepte tener una reunión.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Fecha sugerida por el cliente (ej. Mañana, Lunes, 15 de Octubre)' },
          time: { type: 'string', description: 'Hora sugerida o franja horaria (ej. Por la mañana, a las 15:00)' },
          notes: { type: 'string', description: 'Notas adicionales sobre lo que se quiere ver en la demo' },
        },
        required: ['date', 'time'],
      },
    },
  },
];

export interface LLMResponse {
  content?: string;
  toolCalls?: { id: string; name: string; arguments: any }[];
}

@Injectable()
export class HermesClientService {
  private readonly logger = new Logger(HermesClientService.name);

  constructor(
    @Inject(AI_PROVIDER_TOKEN)
    private readonly aiProvider: IAiProvider,
  ) {}

  async generateResponse(messages: AiMessage[], enableTools = true, toolChoice: 'auto' | 'none' = 'auto'): Promise<LLMResponse> {
    try {
      const options: any = {
        temperature: 0.4,
      };
      if (enableTools) {
        options.tools = HERMES_TOOLS;
        options.toolChoice = toolChoice;
      } else {
        // Al requerir solo texto habiendo tools en el historial, pasamos tools con toolChoice = 'none'
        options.tools = HERMES_TOOLS;
        options.toolChoice = 'none';
      }

      const response: AiResponse = await this.aiProvider.chat(messages, options);

      this.logger.log(`Response received from ${response.provider} | model: ${response.model}`);

      return {
        content: response.content,
        toolCalls: response.toolCalls,
      };
    } catch (error: any) {
      this.logger.error('Error calling AI provider', error.message);
      return {
        content: `Hermes no pudo procesar tu consulta en este momento. Por favor intenta de nuevo.`,
      };
    }
  }
}
