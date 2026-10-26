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
];

export interface LLMResponse {
  content?: string;
  toolCalls?: { id: string; name: string; arguments: any }[];
  error?: string;
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
        temperature: 0.5,
      };
      if (enableTools) {
        options.tools = HERMES_TOOLS;
        options.toolChoice = toolChoice;
      } else {
        // Al requerir solo texto puro (ej: seguimientos), no enviamos tools
        options.toolChoice = 'none';
      }

      const response: AiResponse = await this.aiProvider.chat(messages, options);

      this.logger.log(`Response received from ${response.provider} | model: ${response.model}`);

      return {
        content: response.content,
        toolCalls: response.toolCalls,
      };
    } catch (error: any) {
      this.logger.error(`Error en llamada a proveedor de IA: ${error.message}`);
      return {
        content: undefined,
        error: error.message || 'Error inesperado de comunicación con el LLM',
      };
    }
  }
}
