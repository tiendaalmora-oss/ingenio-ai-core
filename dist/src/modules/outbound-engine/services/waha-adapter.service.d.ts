import { PrismaService } from '../../../shared/database/prisma.service';
export declare class WahaAdapterService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    sendMessage(tenantId: string, contactId: string, content: string): Promise<string>;
}
