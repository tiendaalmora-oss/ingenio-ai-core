import { HealthService } from './health.service';
import { PrismaService } from '../../shared/database/prisma.service';
export declare class HealthController {
    private readonly healthService;
    private readonly prisma;
    constructor(healthService: HealthService, prisma: PrismaService);
    dump(): Promise<{
        tenants: {
            id: string;
            name: string;
            wahaSession: string | null;
            currentBundleVersion: string | null;
            createdAt: Date;
        }[];
        contacts: {
            id: string;
            name: string;
            tenantId: string;
            phone: string | null;
        }[];
        conversations: {
            id: string;
            contactId: string;
            status: string;
        }[];
    }>;
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
