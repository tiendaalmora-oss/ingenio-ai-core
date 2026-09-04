import { PrismaService } from '../../shared/database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
export declare class SettingsService {
    private readonly prisma;
    private readonly eventEmitter;
    private readonly logger;
    constructor(prisma: PrismaService, eventEmitter: EventEmitter2);
    getSettings(tenantId: string): Promise<{
        tenant: {
            id: string | undefined;
            name: string;
            wahaSession: string;
            currentBundleVersion: string;
            createdAt: Date | undefined;
        };
        waha: {
            apiUrl: string;
            session: string;
            hasApiKey: boolean;
            status: string;
        };
        ai: {
            provider: string;
            model: string;
            baseUrl: string;
            hasApiKey: boolean;
        };
        meta: {
            webhookUrl: string;
            verifyTokenConfigured: boolean;
            supportedChannels: string[];
        };
    }>;
    updateTenantSettings(tenantId: string, data: {
        name?: string;
        wahaSession?: string;
    }): Promise<{
        id: string;
        name: string;
        updatedAt: Date;
        status: string;
        plan: string;
        wahaSession: string | null;
        currentBundleVersion: string | null;
        createdAt: Date;
        agencyId: string | null;
    }>;
    cleanSlate(tenantId: string): Promise<{
        status: string;
        tenantId: string;
    }>;
}
