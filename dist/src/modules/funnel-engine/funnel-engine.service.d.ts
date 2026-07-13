import { PrismaService } from '../../shared/database/prisma.service';
import { InteractionReceivedEvent } from '../conversation';
export declare class FunnelEngineService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    evaluateInteraction(payload: InteractionReceivedEvent): Promise<string | null>;
    private processActiveFunnel;
}
