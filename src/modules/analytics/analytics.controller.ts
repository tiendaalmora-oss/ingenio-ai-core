import { Controller, Get, UseGuards, BadRequestException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AdminApiKeyGuard } from '../../shared/guards/admin-api-key.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { TenantId } from '../../shared/decorators/tenant-id.decorator';

@Controller('analytics')
@UseGuards(AdminApiKeyGuard, TenantGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * GET /analytics/summary
   * Retorna métricas clave del embudo, rendimiento por producto, seguimientos y volumen diario.
   */
  @Get('summary')
  async getSummary(@TenantId() tenantId: string) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    return this.analyticsService.getSummary(tenantId);
  }
}
