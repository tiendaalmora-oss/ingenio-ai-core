export interface LLMResponse {
    content?: string;
    toolCalls?: {
        name: string;
        arguments: any;
    }[];
}
export declare class HermesClientService {
    private readonly logger;
    generateResponse(prompt: string): Promise<LLMResponse>;
}
