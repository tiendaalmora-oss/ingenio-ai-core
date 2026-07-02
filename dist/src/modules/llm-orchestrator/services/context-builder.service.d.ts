import { PrismaService } from '../../../shared/database/prisma.service';
export declare class ContextBuilderService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    buildContext(tenantId: string, contactId: string, content: string): Promise<string>;
}
