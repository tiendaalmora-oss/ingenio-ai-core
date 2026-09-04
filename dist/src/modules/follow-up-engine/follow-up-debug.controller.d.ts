import { PrismaService } from '../../shared/database/prisma.service';
import { FollowUpEngineService } from './services/follow-up-engine.service';
import { WahaAdapterService } from '../outbound-engine/services/waha-adapter.service';
export declare class FollowUpDebugController {
    private readonly prisma;
    private readonly followUpEngine;
    private readonly wahaAdapter;
    private readonly logger;
    constructor(prisma: PrismaService, followUpEngine: FollowUpEngineService, wahaAdapter: WahaAdapterService);
    runAudit(): Promise<{
        serverTime: string;
        waha: {
            apiUrl: string;
            configuredSessionEnv: string;
            activeSessions: any;
        };
        tenants: any[];
        activeConversationsCount: number;
        conversations: {
            conversationId: string;
            status: string;
            contact: {
                id: string;
                phone: string | null;
                name: string;
                leadStatus: string;
            };
            lastInteraction: string | {
                direction: string;
                content: string;
                timestamp: Date;
                elapsedMinutes: string;
            };
        }[];
        recentOutboundMessages: {
            id: string;
            contactId: string;
            followUpId: string | null;
            status: string;
            retries: number;
            createdAt: Date;
            sentAt: Date | null;
            messageSnippet: string;
            providerResponse: string | null;
        }[];
    }>;
    triggerEvaluation(): Promise<{
        message: string;
        report: any;
    }>;
    sendTestMessage(body: {
        phone: string;
        message?: string;
    }): Promise<{
        error: string;
        status?: undefined;
        phone?: undefined;
        message?: undefined;
        wahaMessageId?: undefined;
    } | {
        status: string;
        phone: string;
        message: string;
        wahaMessageId: string;
        error?: undefined;
    } | {
        status: string;
        phone: string;
        error: any;
        message?: undefined;
        wahaMessageId?: undefined;
    }>;
}
