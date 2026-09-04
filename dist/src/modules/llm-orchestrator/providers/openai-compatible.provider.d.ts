import { IAiProvider, AiMessage, AiOptions, AiResponse } from './ai-provider.interface';
export declare class OpenAiCompatibleProvider extends IAiProvider {
    private readonly baseUrl;
    private readonly apiKey;
    private readonly model;
    private readonly providerName;
    private readonly extraHeaders;
    private readonly logger;
    constructor(baseUrl: string, apiKey: string, model: string, providerName: string, extraHeaders?: Record<string, string>);
    chat(messages: AiMessage[], options?: AiOptions): Promise<AiResponse>;
}
