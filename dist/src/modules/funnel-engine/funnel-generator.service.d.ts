import { AutomationDsl } from './automation-compiler.service';
export declare class FunnelGeneratorService {
    private readonly logger;
    generateFunnel(prompt: string): Promise<AutomationDsl>;
}
