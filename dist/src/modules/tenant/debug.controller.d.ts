import { PrismaService } from '../../shared/database/prisma.service';
import { TenantResolverService } from './services/tenant-resolver.service';
export declare class DebugTenantController {
    private readonly prisma;
    private readonly tenantResolverService;
    constructor(prisma: PrismaService, tenantResolverService: TenantResolverService);
    getTenantDebugInfo(): Promise<{
        tenants: {
            id: string;
            name: string;
            wahaSession: string | null;
        }[];
        counts: any[];
        resolutionTest: {
            session: string;
            success: boolean;
            result: string | null;
            error: string | null;
        };
    }>;
}
