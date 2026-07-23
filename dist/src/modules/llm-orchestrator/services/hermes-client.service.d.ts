import { IAiProvider } from '../providers/ai-provider.interface';
import type { AiMessage } from '../providers/ai-provider.interface';
export interface LLMResponse {
    content?: string;
    toolCalls?: {
        id: string;
        name: string;
        arguments: any;
    }[];
}
export declare class HermesClientService {
    private readonly aiProvider;
    private readonly logger;
    constructor(aiProvider: IAiProvider);
    generateResponse(messages: AiMessage[]): Promise<LLMResponse>;
}
