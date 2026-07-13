import { HealthService } from './health.service';
export declare class HealthController {
    private readonly healthService;
    constructor(healthService: HealthService);
    getSystemStatus(): Promise<{
        status: {
            waha: string;
            hermes: string;
            executiveLoop: string;
            skillEngine: string;
            knowledgeBundle: string;
            postgresql: string;
            webhook: string;
            openai: string;
            crm: string;
            businessStudio: string;
        };
        metrics: {
            conversaciones: number;
            skills: number;
            leads: number;
            tokens: string;
            costo: string;
            errores: number;
        };
    }>;
}
