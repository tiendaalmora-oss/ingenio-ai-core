import { PrismaService } from '../../../shared/database/prisma.service';
import { MetaChannelAdapterService } from './meta-channel-adapter.service';
export declare class WahaAdapterService {
    private readonly prisma;
    private readonly metaChannelAdapter;
    private readonly logger;
    private cachedActiveSession;
    constructor(prisma: PrismaService, metaChannelAdapter: MetaChannelAdapterService);
    normalizeJid(rawId: string): string;
    resolveTargetChatId(contactIdOrPhone: string): Promise<{
        chatId: string;
        contactId?: string;
    }>;
    resolveSession(tenantId?: string): Promise<string>;
    private healContactExternalId;
    private executeTypingWithRetry;
    startTyping(tenantId: string, contactIdOrPhone: string): Promise<void>;
    stopTyping(tenantId: string, contactIdOrPhone: string): Promise<void>;
    sendMessage(tenantId: string, contactIdOrPhone: string, content: string): Promise<string>;
    getWahaSessions(): Promise<any>;
}
