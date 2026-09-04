import { PrismaService } from '../../shared/database/prisma.service';
import { WahaAdapterService } from '../outbound-engine/services/waha-adapter.service';
export declare class ConversationHubController {
    private readonly prisma;
    private readonly wahaAdapter;
    private readonly logger;
    constructor(prisma: PrismaService, wahaAdapter: WahaAdapterService);
    listConversations(tenantId: string, page?: string, limit?: string, search?: string, status?: string): Promise<{
        total: number;
        page: number;
        limit: number;
        data: {
            id: string;
            status: string;
            contactId: string;
            contactName: string;
            contactPhone: string | null;
            leadStatus: string | null;
            tags: string[];
            messageCount: number;
            lastMessage: {
                content: string;
                direction: string;
                role: string | null;
                timestamp: Date;
            } | null;
        }[];
    }>;
    private consolidateDuplicateConversations;
    getConversation(id: string, tenantId: string): Promise<{
        id: string;
        status: string;
        contact: {
            id: string;
            name: string;
            phone: string | null;
            leadStatus: string | null | undefined;
            company: string | null | undefined;
            interests: string[];
            objections: string[];
            tags: string[];
            lastInteraction: Date | null | undefined;
        };
        activeFunnel: {
            funnelId: string;
            step: string;
        } | null;
        messageCount: number;
    }>;
    getMessages(id: string, tenantId: string, page?: string, limit?: string): Promise<{
        total: number;
        page: number;
        data: {
            id: string;
            direction: string;
            type: string;
            content: string;
            role: string | null;
            timestamp: Date;
            toolCalls: import("@prisma/client/runtime/client").JsonValue;
        }[];
    }>;
    sendManualMessage(id: string, tenantId: string, body: {
        content: string;
    }): Promise<{
        success: boolean;
        messageId: string;
        content: string;
        timestamp: Date;
    }>;
    deleteMessage(id: string, messageId: string, tenantId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    updateStatus(id: string, tenantId: string, body: {
        status: string;
    }): Promise<{
        success: boolean;
        count: number;
    }>;
    resetHistory(id: string, tenantId: string): Promise<{
        success: boolean;
        conversationId: string;
        message: string;
    }>;
    purgeContact(id: string, tenantId: string): Promise<{
        success: boolean;
        contactId: string;
        message: string;
    }>;
}
