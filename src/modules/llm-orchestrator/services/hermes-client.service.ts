import { Injectable, Logger } from '@nestjs/common';

export interface LLMResponse {
  content?: string;
  toolCalls?: {
    name: string;
    arguments: any;
  }[];
}

@Injectable()
export class HermesClientService {
  private readonly logger = new Logger(HermesClientService.name);

  async generateResponse(prompt: string): Promise<LLMResponse> {
    const hermesUrl = process.env.HERMES_BASE_URL || 'http://localhost:4000/api/v1/hermes';
    const apiKey = process.env.HERMES_API_KEY || '';

    this.logger.log(`LLM Inference Triggered contra Hermes API real en ${hermesUrl}...`);

    try {
      const response = await fetch(`${hermesUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        throw new Error(`Hermes API respondió con error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      return {
        content: result.content,
        toolCalls: result.toolCalls
      };
    } catch (error: any) {
      this.logger.error('Error llamando a la API de Hermes', error.message);
      return { content: `(Hermes Auto-Response Fallback): Ocurrió un error conectando con la API de Hermes.` };
    }
  }
}
