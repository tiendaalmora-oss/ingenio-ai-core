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

  async generateResponse(messages: any[]): Promise<LLMResponse> {
    const hermesUrl = process.env.HERMES_BASE_URL || 'http://localhost:4000/api/v1/hermes';
    const apiKey = process.env.HERMES_API_KEY || '';

    this.logger.log(`LLM Inference Triggered contra Hermes API real en ${hermesUrl}...`);

    const model = process.env.HERMES_MODEL || 'hermes';

    try {
      const response = await fetch(`${hermesUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'X-Hermes-Session-Id': 'ingenio-core-default-session'
        },
        body: JSON.stringify({
          model,
          messages: messages
        })
      });

      if (!response.ok) {
        throw new Error(`Hermes API respondió con error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const choice = result.choices?.[0]?.message;
      
      let parsedToolCalls = undefined;
      if (choice?.tool_calls && choice.tool_calls.length > 0) {
        parsedToolCalls = choice.tool_calls.map((tc: any) => {
          let args = {};
          try {
            args = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments;
          } catch(e) {}
          return {
            name: tc.function.name,
            arguments: args
          };
        });
      }

      return {
        content: choice?.content || undefined,
        toolCalls: parsedToolCalls
      };
    } catch (error: any) {
      this.logger.error('Error llamando a la API de Hermes', error.message);
      return { content: `(Hermes Auto-Response Fallback): Ocurrió un error conectando con la API de Hermes.` };
    }
  }
}
