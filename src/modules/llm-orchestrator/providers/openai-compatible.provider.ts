import { Logger } from '@nestjs/common';
import { IAiProvider, AiMessage, AiOptions, AiResponse } from './ai-provider.interface';

/**
 * Adapter for OpenAI-compatible endpoints.
 * Works with: OpenAI, OpenRouter, Gemini (via OpenAI-compatible endpoint), any /v1/chat/completions API.
 */
export class OpenAiCompatibleProvider extends IAiProvider {
  private readonly logger = new Logger('AiProvider');

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly model: string,
    private readonly providerName: string,
    private readonly extraHeaders: Record<string, string> = {},
  ) {
    super();
  }

  async chat(messages: AiMessage[], options?: AiOptions): Promise<AiResponse> {
    const body: any = {
      model: this.model,
      messages,
    };

    // Si toolChoice es 'none' o no se requieren herramientas, omitir tools para modo texto puro
    if (options?.tools && options.tools.length > 0 && options.toolChoice !== 'none') {
      body.tools = options.tools;
      body.tool_choice = options.toolChoice || 'auto';
    }
    if (options?.temperature !== undefined) body.temperature = options.temperature;
    if (options?.maxTokens !== undefined) body.max_tokens = options.maxTokens;

    const maxRetries = 2;
    const timeoutMs = 25_000;
    let lastError: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const backoffDelay = Math.pow(2, attempt - 1) * 1000;
          this.logger.warn(`[${this.providerName}] Reintento ${attempt}/${maxRetries} tras error previo. Esperando ${backoffDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }

        this.logger.log(`[${this.providerName}] Calling ${this.baseUrl}/chat/completions (intento ${attempt + 1}) → model: ${this.model}`);

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            ...this.extraHeaders,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (!response.ok) {
          const errText = await response.text();
          const isTransient = [429, 500, 502, 503, 504].includes(response.status);
          const errorMsg = `[${this.providerName}] ${response.status} ${response.statusText}: ${errText}`;
          
          if (isTransient && attempt < maxRetries) {
            this.logger.warn(`[${this.providerName}] Error transitorio detectado (${response.status}): ${errorMsg}`);
            lastError = new Error(errorMsg);
            continue;
          }
          throw new Error(errorMsg);
        }

        const result = await response.json();
        const choice = result.choices?.[0]?.message;

        let toolCalls: AiResponse['toolCalls'];
        if (choice?.tool_calls?.length > 0) {
          toolCalls = choice.tool_calls.map((tc: any) => {
            let args: Record<string, any> = {};
            try {
              args = typeof tc.function.arguments === 'string'
                ? JSON.parse(tc.function.arguments)
                : tc.function.arguments;
            } catch (_) {}
            return { id: tc.id ?? tc.function.name, name: tc.function.name, arguments: args };
          });
        }

        return {
          content: choice?.content ?? undefined,
          toolCalls,
          provider: this.providerName,
          model: this.model,
        };
      } catch (err: any) {
        lastError = err;
        const isAbort = err.name === 'TimeoutError' || err.name === 'AbortError';
        const isNetwork = err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.message?.includes('fetch failed');
        
        if ((isAbort || isNetwork) && attempt < maxRetries) {
          this.logger.warn(`[${this.providerName}] Error de conexión/timeout en intento ${attempt + 1}: ${err.message}. Reintentando...`);
          continue;
        }

        if (attempt >= maxRetries) {
          break;
        }
        throw err;
      }
    }

    throw lastError || new Error(`[${this.providerName}] Fallo inesperado en comunicación con el LLM tras reintentos.`);
  }
}
