import { HealthService } from './health.service';
export declare class HealthController {
    private readonly healthService;
    dump(): Promise<{
        tenants: any;
        contacts: any;
        conversations: any;
    }>;
    constructor(healthService: HealthService);
    getSystemStatus(): Promise<{
        metrics: {
            conversations: number;
            leads: number;
            knowledgeBundles: number;
            automations: number;
            skillsExecuted: number;
        };
        services: {
            name: string;
            status: string;
            latency: string;
            detail: string;
        }[];
    }>;
}
