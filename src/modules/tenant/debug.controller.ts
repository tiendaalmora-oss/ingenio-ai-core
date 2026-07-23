import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { TenantResolverService } from './services/tenant-resolver.service';

@Controller('debug/tenant')
export class DebugTenantController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantResolverService: TenantResolverService,
  ) {}

  @Get()
  async getTenantDebugInfo() {
    // 1. All tenants
    const tenants = await this.prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        wahaSession: true,
      },
    });

    // 2. Counts per tenant
    const counts: any[] = [];
    for (const tenant of tenants) {
      const contacts = await this.prisma.contact.count({ where: { tenantId: tenant.id } });
      const conversations = await this.prisma.conversation.count({ where: { contact: { tenantId: tenant.id } } });
      const businessMemories = await this.prisma.businessMemory.count({ where: { contact: { tenantId: tenant.id } } });
      const knowledgeBundles = await this.prisma.knowledgeBundle.count({ where: { tenantId: tenant.id } });
      
      counts.push({
        tenantId: tenant.id,
        contacts,
        conversations,
        businessMemories,
        knowledgeBundles
      });
    }

    // 3 & 4. Resolve 'ferreos'
    let resolveResult: string | null = null;
    let resolveError: string | null = null;
    try {
      resolveResult = await this.tenantResolverService.resolveFromWahaSession('ferreos');
    } catch (err: any) {
      resolveError = err.message || String(err);
    }

    return {
      tenants,
      counts,
      resolutionTest: {
        session: 'ferreos',
        success: !!resolveResult,
        result: resolveResult,
        error: resolveError,
      },
    };
  }
}

