import { PrismaService } from '../../../shared/database/prisma.service';
import { MetaChannelAdapterService } from './meta-channel-adapter.service';
export declare class WahaAdapterService {
    private readonly prisma;
    private readonly metaChannelAdapter;
    private readonly logger;
    constructor(prisma: PrismaService, metaChannelAdapter: MetaChannelAdapterService);
    private normalizeJid;
    sendMessage(tenantId: string, contactIdOrPhone: string, content: string): Promise<string>;
    startTyping(tenantId: string, contactIdOrPhone: string): Promise<void>;
    stopTyping(tenantId: string, contactIdOrPhone: string): Promise<void>;
    getWahaSessions(): Promise<any>;
}
