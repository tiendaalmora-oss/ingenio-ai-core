import { PrismaService } from '../../../shared/database/prisma.service';
import { KosLoaderService } from './kos-loader.service';
export declare class ContextBuilderService {
    private readonly prisma;
    private readonly kosLoader;
    private readonly logger;
    constructor(prisma: PrismaService, kosLoader: KosLoaderService);
    buildContext(tenantId: string, contactId: string, conversationId: string, content: string, funnelInstruction?: string | null): Promise<any[]>;
}
