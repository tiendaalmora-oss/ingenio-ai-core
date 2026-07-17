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

    if (options?.tools && options.tools.length > 0) {
      body.tools = options.tools;
      body.tool_choice = 'auto';
    }
    if (options?.temperature !== undefined) body.temperature = options.temperature;
    if (options?.maxTokens !== undefined) body.max_tokens = options.maxTokens;

    this.logger.log(`[${this.providerName}] Calling ${this.baseUrl}/chat/completions → model: ${this.model}`);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        ...this.extraHeaders,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`[${this.providerName}] ${response.status} ${response.statusText}: ${errText}`);
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
  }
}
