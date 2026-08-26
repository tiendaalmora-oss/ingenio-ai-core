import { Controller, Get, Put, Param, Body, Headers, BadRequestException, Post, Delete, UseGuards } from '@nestjs/common';
import { BusinessStudioService } from './business-studio.service';
import { BootstrapService } from './bootstrap.service';
import { AdminApiKeyGuard } from '../../shared/guards/admin-api-key.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { TenantId } from '../../shared/decorators/tenant-id.decorator';

@Controller('business-studio')
@UseGuards(AdminApiKeyGuard, TenantGuard)
export class BusinessStudioController {
  constructor(
    private readonly studioService: BusinessStudioService,
    private readonly bootstrapService: BootstrapService
  ) {}

  @Get('bootstrap')
  async getBootstrap(@TenantId() tenantId: string) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    return this.bootstrapService.getBootstrap(tenantId);
  }

  @Get('bundle')
  async getBundle(@TenantId() tenantId: string) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    return this.studioService.getBundle(tenantId);
  }

  @Get('bundle/:section')
  async getBundleSection(
    @Param('section') section: string,
    @TenantId() tenantId: string
  ) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    const bundle = await this.studioService.getBundle(tenantId);
    return bundle[section] || null;
  }

  @Put('bundle/:section')
  async updateSection(
    @Param('section') section: string,
    @Body() data: any,
    @TenantId() tenantId: string,
    @Headers('x-knowledge-version') expectedVersion?: string
  ) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    return this.studioService.updateSection(tenantId, section, data, expectedVersion ? parseInt(expectedVersion, 10) : undefined);
  }

  // --- KNOWLEDGE BASE MENU --- //

  @Get('menu')
  getMenu() {
    return this.studioService.getMenu();
  }

  @Get('status')
  async getStatus(@TenantId() tenantId: string) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    return this.studioService.getStatus(tenantId);
  }

  @Get('health')
  async getHealth(@TenantId() tenantId: string) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    return this.studioService.getHealth(tenantId);
  }

  @Get('stats')
  async getStats(@TenantId() tenantId: string) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    return this.studioService.getStats(tenantId);
  }

  @Get('schema')
  getSchema() {
    return this.studioService.getSchema();
  }

  @Get('dashboard')
  async getDashboard(@TenantId() tenantId: string) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    return this.studioService.getDashboard(tenantId);
  }

  @Get('knowledge-base')
  async getKnowledgeBase(@TenantId() tenantId: string) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    return this.studioService.getKnowledgeBase(tenantId);
  }

  @Put('knowledge-base/:section')
  async updateKnowledgeBaseSection(
    @Param('section') section: string,
    @Body() data: any,
    @TenantId() tenantId: string,
    @Headers('x-knowledge-version') expectedVersion?: string
  ) {
    this.validateSection(tenantId, section);
    return this.studioService.updateSection(tenantId, section, data, expectedVersion ? parseInt(expectedVersion, 10) : undefined);
  }

  @Get('knowledge-base/:section')
  async getKnowledgeBaseSection(
    @Param('section') section: string,
    @TenantId() tenantId: string
  ) {
    this.validateSection(tenantId, section);
    return this.studioService.getSection(tenantId, section);
  }

  @Get('knowledge-base/:section/items')
  async getItems(
    @Param('section') section: string,
    @TenantId() tenantId: string
  ) {
    this.validateSection(tenantId, section);
    return this.studioService.getItems(tenantId, section);
  }

  @Post('knowledge-base/:section/items')
  async addItem(
    @Param('section') section: string,
    @Body() data: any,
    @TenantId() tenantId: string,
    @Headers('x-knowledge-version') expectedVersion?: string
  ) {
    this.validateSection(tenantId, section);
    return this.studioService.addItem(tenantId, section, data, expectedVersion ? parseInt(expectedVersion, 10) : undefined);
  }

  @Put('knowledge-base/:section/items/:id')
  async updateItem(
    @Param('section') section: string,
    @Param('id') id: string,
    @Body() data: any,
    @TenantId() tenantId: string,
    @Headers('x-knowledge-version') expectedVersion?: string
  ) {
    this.validateSection(tenantId, section);
    return this.studioService.updateItem(tenantId, section, id, data, expectedVersion ? parseInt(expectedVersion, 10) : undefined);
  }

  @Delete('knowledge-base/:section/items/:id')
  async deleteItem(
    @Param('section') section: string,
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Headers('x-knowledge-version') expectedVersion?: string
  ) {
    this.validateSection(tenantId, section);
    return this.studioService.deleteItem(tenantId, section, id, expectedVersion ? parseInt(expectedVersion, 10) : undefined);
  }

  private validateSection(tenantId: string, section: string) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    
    const validSections = [
      'identidad', 'empresa', 'enrutamiento',
      'productos', 'categorias', 'servicios', 'faqs', 'objeciones', 
      'scriptsComerciales', 'promociones', 'seguimientos', 'soporte', 'politicasAtencion'
    ];

    if (!validSections.includes(section)) {
      throw new BadRequestException(`Sección '${section}' no es válida para la Knowledge Base. Opciones válidas: ${validSections.join(', ')}`);
    }
  }
}
