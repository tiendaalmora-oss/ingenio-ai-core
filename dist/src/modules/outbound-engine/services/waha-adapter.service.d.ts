import { PrismaService } from '../../../shared/database/prisma.service';
import { MetaChannelAdapterService } from './meta-channel-adapter.service';
export declare class WahaAdapterService {
    private readonly prisma;
    private readonly metaChannelAdapter;
    private readonly logger;
    private cachedActiveSession;
    private readonly sentBySystemMessageIds;
    private readonly recentOutboundsByTarget;
    constructor(prisma: PrismaService, metaChannelAdapter: MetaChannelAdapterService);
    private normalizeComparisonText;
    markMessageAsSentBySystem(messageId: any): void;
    markOutboundDispatched(targetChatIdOrPhone: string, content: string): void;
    isSentBySystemContent(targetChatIdOrPhone: string, content: string): boolean;
    isSentBySystem(messageId: any): boolean;
    normalizeJid(rawId: string): string;
    resolveTargetChatId(contactIdOrPhone: string): Promise<{
        chatId: string;
        contactId?: string;
    }>;
    resolveWahaConfig(tenantId?: string, sessionName?: string): {
        apiUrl: string;
        apiKey: string;
        isProd: boolean;
    };
    resolveSession(tenantId?: string): Promise<string>;
    private healContactExternalId;
    private executeTypingWithRetry;
    startTyping(tenantId: string, contactIdOrPhone: string): Promise<void>;
    stopTyping(tenantId: string, contactIdOrPhone: string): Promise<void>;
    sendMessage(tenantId: string, contactIdOrPhone: string, content: string): Promise<string>;
    getWahaSessions(target?: 'prod' | 'sandbox' | 'all'): Promise<any>;
}
