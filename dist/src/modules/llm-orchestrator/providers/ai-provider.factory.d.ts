import { IAiProvider } from './ai-provider.interface';
export declare const AI_PROVIDER_TOKEN = "AI_PROVIDER";
export declare class AiProviderFactory {
    private readonly logger;
    create(): IAiProvider;
}
