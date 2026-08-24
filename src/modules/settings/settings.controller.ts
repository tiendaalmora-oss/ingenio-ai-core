import { Controller, Get, Patch, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { AdminApiKeyGuard } from '../../shared/guards/admin-api-key.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { TenantId } from '../../shared/decorators/tenant-id.decorator';

@Controller('settings')
@UseGuards(AdminApiKeyGuard, TenantGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getSettings(@TenantId() tenantId: string) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    return this.settingsService.getSettings(tenantId);
  }

  @Patch('tenant')
  async updateTenant(
    @TenantId() tenantId: string,
    @Body() body: { name?: string; wahaSession?: string },
  ) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    return this.settingsService.updateTenantSettings(tenantId, body);
  }

  @Post('clean-slate')
  async cleanSlate(@TenantId() tenantId: string) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    return this.settingsService.cleanSlate(tenantId);
  }
}
