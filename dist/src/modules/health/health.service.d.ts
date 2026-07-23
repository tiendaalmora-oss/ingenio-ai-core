import { PrismaService } from '../../shared/database/prisma.service';
export declare class HealthService {
    private prisma;
    constructor(prisma: PrismaService);
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
