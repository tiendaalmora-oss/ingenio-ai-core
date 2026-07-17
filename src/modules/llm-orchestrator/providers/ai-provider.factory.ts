import { Injectable, Logger } from '@nestjs/common';
import { IAiProvider } from './ai-provider.interface';
import { OpenAiCompatibleProvider } from './openai-compatible.provider';

export const AI_PROVIDER_TOKEN = 'AI_PROVIDER';

/**
 * Factory that reads AI_PROVIDER env var and builds the correct adapter.
 *
 * Supported providers:
 *  - openrouter  → https://openrouter.ai/api/v1
 *  - openai      → https://api.openai.com/v1
 *  - gemini      → https://generativelanguage.googleapis.com/v1beta/openai
 *  - ollama      → http://localhost:11434/v1 (no auth)
 *  - custom      → AI_BASE_URL must be set explicitly
 */
@Injectable()
export class AiProviderFactory {
  private readonly logger = new Logger(AiProviderFactory.name);

  create(): IAiProvider {
    const provider = (process.env.AI_PROVIDER ?? 'openai').toLowerCase();
    const apiKey  = process.env.AI_API_KEY ?? '';
    const model   = process.env.AI_MODEL ?? 'gpt-4o-mini';

    let baseUrl: string;
    let name: string;
    let extraHeaders: Record<string, string> = {};

    switch (provider) {
      case 'openrouter':
        baseUrl = process.env.AI_BASE_URL ?? 'https://openrouter.ai/api/v1';
        name    = 'OpenRouter';
        extraHeaders = {
          'HTTP-Referer': 'https://os.ingeniodigital.shop',
          'X-Title': 'Ingenio OS',
        };
        break;

      case 'gemini':
        baseUrl = process.env.AI_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta/openai';
        name    = 'Gemini';
        break;

      case 'ollama':
        baseUrl = process.env.AI_BASE_URL ?? 'http://localhost:11434/v1';
        name    = 'Ollama';
        break;

      case 'openai':
      default:
        baseUrl = process.env.AI_BASE_URL ?? 'https://api.openai.com/v1';
        name    = 'OpenAI';
        break;
    }

    this.logger.log(`AI Provider initialized: ${name} | model: ${model} | url: ${baseUrl}`);

    return new OpenAiCompatibleProvider(baseUrl, apiKey, model, name, extraHeaders);
  }
}
