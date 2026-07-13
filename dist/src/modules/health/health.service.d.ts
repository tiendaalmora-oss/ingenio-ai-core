import { PrismaService } from '../../shared/database/prisma.service';
export declare class HealthService {
    private prisma;
    constructor(prisma: PrismaService);
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
