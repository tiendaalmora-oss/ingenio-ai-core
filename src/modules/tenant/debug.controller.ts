import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
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
    const contactCounts = await this.prisma.contact.groupBy({
      by: ['tenantId'],
      _count: true,
    });

    const conversationCounts = await this.prisma.conversation.groupBy({
      by: ['tenantId'],
      _count: true,
    });

    const businessMemoryCounts = await this.prisma.businessMemory.groupBy({
      by: ['tenantId'],
      _count: true,
    });

    const knowledgeBundleCounts = await this.prisma.knowledgeBundle.groupBy({
      by: ['tenantId'],
      _count: true,
    });

    // 3 & 4. Resolve 'ferreos'
    let resolveResult = null;
    let resolveError = null;
    try {
      resolveResult = await this.tenantResolverService.resolveFromWahaSession('ferreos');
    } catch (err: any) {
      resolveError = err.message || String(err);
    }

    return {
      tenants,
      counts: {
        contacts: contactCounts.map(c => ({ tenantId: c.tenantId, count: c._count })),
        conversations: conversationCounts.map(c => ({ tenantId: c.tenantId, count: c._count })),
        businessMemories: businessMemoryCounts.map(c => ({ tenantId: c.tenantId, count: c._count })),
        knowledgeBundles: knowledgeBundleCounts.map(c => ({ tenantId: c.tenantId, count: c._count })),
      },
      resolutionTest: {
        session: 'ferreos',
        success: !!resolveResult,
        result: resolveResult,
        error: resolveError,
      },
    };
  }
}
