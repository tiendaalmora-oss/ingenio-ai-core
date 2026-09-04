import { PrismaService } from '../../../shared/database/prisma.service';
import { KosLoaderService } from './kos-loader.service';
import { PromptComposerService } from './prompt-composer.service';
export declare class ContextBuilderService {
    private readonly prisma;
    private readonly kosLoader;
    private readonly promptComposer;
    private readonly logger;
    constructor(prisma: PrismaService, kosLoader: KosLoaderService, promptComposer: PromptComposerService);
    buildContext(tenantId: string, contactId: string, conversationId: string, content?: string | null, funnelInstruction?: string | null): Promise<any[]>;
    buildFollowUpContext(tenantId: string, contactId: string, conversationId: string, ruleApplied: any): Promise<any[]>;
}
