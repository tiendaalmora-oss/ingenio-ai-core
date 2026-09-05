import { SettingsService } from './settings.service';
export declare class SettingsController {
    private readonly settingsService;
    constructor(settingsService: SettingsService);
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
    updateTenant(tenantId: string, body: {
        name?: string;
        wahaSession?: string;
    }): Promise<{
        id: string;
        name: string;
        status: string;
        plan: string;
        wahaSession: string | null;
        currentBundleVersion: string | null;
        createdAt: Date;
        updatedAt: Date;
        agencyId: string | null;
    }>;
    cleanSlate(tenantId: string): Promise<{
        status: string;
        tenantId: string;
    }>;
}
