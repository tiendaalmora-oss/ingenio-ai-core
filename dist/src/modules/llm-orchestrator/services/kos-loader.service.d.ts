import { PrismaService } from '../../../shared/database/prisma.service';
export declare class KosLoaderService {
    private readonly prisma;
    private readonly logger;
    private readonly cache;
    constructor(prisma: PrismaService);
    load(tenantId: string): Promise<any>;
    private cleanExpiredCache;
    private getFallbackBundle;
    handleKnowledgeBaseUpdated(payload: {
        tenantId: string;
    }): void;
}
