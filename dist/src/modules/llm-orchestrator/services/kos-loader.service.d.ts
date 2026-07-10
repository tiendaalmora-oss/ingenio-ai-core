import { PrismaService } from '../../../shared/database/prisma.service';
export declare class KosLoaderService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    load(tenantId: string): Promise<any>;
    private getFallbackBundle;
}
