import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { BusinessStudioService } from './business-studio.service';

@Injectable()
export class BootstrapService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studioService: BusinessStudioService
  ) {}

  async getBootstrap(tenantId: string) {
    // Single DB hit for KnowledgeBundle
    const bundle = await this.prisma.knowledgeBundle.findUnique({
      where: { tenantId }
    });

    // Fetch tenant name for display in the UI
    const tenantRecord = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, plan: true, status: true },
    });

    // Reuse it across orchestrations to avoid duplicate Prisma queries
    const menu = this.studioService.getMenu();
    const knowledgeSchema = this.studioService.getSchema();
    
    // Concurrently fetch the rest passing the pre-fetched bundle
    const [dashboard, status, stats, knowledgeBundle] = await Promise.all([
      this.studioService.getDashboard(tenantId, bundle),
      this.studioService.getStatus(tenantId, bundle),
      this.studioService.getStats(tenantId, bundle),
      this.studioService.getKnowledgeBase(tenantId, bundle),
    ]);

    // Health depends on Status
    const health = await this.studioService.getHealth(tenantId, status);

    return {
      menu,
      dashboard,
      status,
      health,
      stats,
      knowledgeSchema,
      knowledgeBundle,
      tenant: tenantId,
      tenantName: tenantRecord?.name ?? tenantId,
      tenantPlan: tenantRecord?.plan ?? 'starter',
      version: bundle?.version || 0,
      cacheStatus: bundle ? 'HIT' : 'MISSING',
      timestamp: new Date()
    };
  }
}
