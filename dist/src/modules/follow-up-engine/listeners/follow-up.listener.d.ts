import { PrismaService } from '../../../shared/database/prisma.service';
import { ContextBuilderService } from '../../llm-orchestrator/services/context-builder.service';
import { HermesClientService } from '../../llm-orchestrator/services/hermes-client.service';
export declare class FollowUpListenerService {
    private readonly contextBuilder;
    private readonly hermesClient;
    private readonly prisma;
    private readonly logger;
    constructor(contextBuilder: ContextBuilderService, hermesClient: HermesClientService, prisma: PrismaService);
    handleFollowUpPending(payload: any): Promise<void>;
}
