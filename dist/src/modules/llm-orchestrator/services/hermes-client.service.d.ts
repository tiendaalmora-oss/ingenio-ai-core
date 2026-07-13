export interface LLMResponse {
    content?: string;
    toolCalls?: {
        id: string;
        name: string;
        arguments: any;
    }[];
}
export declare class HermesClientService {
    private readonly logger;
    generateResponse(messages: any[]): Promise<LLMResponse>;
}
