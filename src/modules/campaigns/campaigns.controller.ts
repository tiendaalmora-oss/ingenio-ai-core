import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { AdminApiKeyGuard } from '../../shared/guards/admin-api-key.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { TenantId } from '../../shared/decorators/tenant-id.decorator';
import { CreateCampaignDto, EstimateAudienceDto } from './dto/create-campaign.dto';

@Controller('campaigns')
@UseGuards(AdminApiKeyGuard, TenantGuard)
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  /**
   * GET /campaigns/estimate
   * Estima la cantidad de destinatarios según los filtros en tiempo real.
   */
  @Get('estimate')
  async estimateAudience(
    @TenantId() tenantId: string,
    @Query('leadStatus') leadStatus?: string,
    @Query('product') product?: string,
    @Query('tags') tags?: string,
    @Query('channel') channel?: 'WHATSAPP' | 'EMAIL' | 'BOTH',
  ) {
    if (!tenantId) throw new BadRequestException('tenantId es requerido');

    const parsedTags = tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined;
    const filters: EstimateAudienceDto = {
      leadStatus,
      product,
      tags: parsedTags,
      channel,
    };

    return this.campaignsService.estimateAudience(tenantId, filters);
  }

  /**
   * GET /campaigns/filters
   * Devuelve las etiquetas y productos oficiales disponibles para filtrar.
   */
  @Get('filters')
  async getFilterOptions(@TenantId() tenantId: string) {
    if (!tenantId) throw new BadRequestException('tenantId es requerido');
    return this.campaignsService.getAvailableFilterOptions(tenantId);
  }

  /**
   * GET /campaigns
   * Lista todas las campañas de la subcuenta.
   */
  @Get()
  async listCampaigns(@TenantId() tenantId: string) {
    if (!tenantId) throw new BadRequestException('tenantId es requerido');
    return this.campaignsService.listCampaigns(tenantId);
  }

  /**
   * GET /campaigns/:id
   * Obtiene detalles, estado y avance de una campaña.
   */
  @Get(':id')
  async getCampaignDetails(@TenantId() tenantId: string, @Param('id') id: string) {
    if (!tenantId) throw new BadRequestException('tenantId es requerido');
    return this.campaignsService.getCampaignDetails(tenantId, id);
  }

  /**
   * POST /campaigns
   * Crea y lanza una nueva campaña.
   */
  @Post()
  async createCampaign(@TenantId() tenantId: string, @Body() body: CreateCampaignDto) {
    if (!tenantId) throw new BadRequestException('tenantId es requerido');
    return this.campaignsService.createCampaign(tenantId, body);
  }

  /**
   * POST /campaigns/:id/pause
   * Pausa el goteo de una campaña activa.
   */
  @Post(':id/pause')
  async pauseCampaign(@TenantId() tenantId: string, @Param('id') id: string) {
    if (!tenantId) throw new BadRequestException('tenantId es requerido');
    return this.campaignsService.pauseCampaign(tenantId, id);
  }

  /**
   * POST /campaigns/:id/resume
   * Reanuda el goteo de una campaña pausada.
   */
  @Post(':id/resume')
  async resumeCampaign(@TenantId() tenantId: string, @Param('id') id: string) {
    if (!tenantId) throw new BadRequestException('tenantId es requerido');
    return this.campaignsService.resumeCampaign(tenantId, id);
  }

  /**
   * POST /campaigns/:id/cancel
   * Cancela una campaña definitivamente.
   */
  @Post(':id/cancel')
  async cancelCampaign(@TenantId() tenantId: string, @Param('id') id: string) {
    if (!tenantId) throw new BadRequestException('tenantId es requerido');
    return this.campaignsService.cancelCampaign(tenantId, id);
  }
}
