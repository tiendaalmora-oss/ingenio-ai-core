import { PrismaService } from '../../../shared/database/prisma.service';
export declare class TenantResolverService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    resolveFromWahaSession(sessionName: string): Promise<string>;
}
