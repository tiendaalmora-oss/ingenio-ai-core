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
            updatedAt: Date;
            status: string;
            plan: string;
            wahaSession: string | null;
            currentBundleVersion: string | null;
            createdAt: Date;
            agencyId: string | null;
        }[];
        contacts: {
            id: string;
            name: string;
            tenantId: string;
            externalId: string | null;
            phone: string | null;
            phoneNormalized: string | null;
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
