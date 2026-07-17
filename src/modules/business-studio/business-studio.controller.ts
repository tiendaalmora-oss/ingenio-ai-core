import { Controller, Get, Put, Param, Body, Headers, BadRequestException } from '@nestjs/common';
import { BusinessStudioService } from './business-studio.service';

@Controller('business-studio')
export class BusinessStudioController {
  constructor(private readonly studioService: BusinessStudioService) {}

  @Get('bundle')
  async getBundle(@Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) throw new BadRequestException('x-tenant-id header is required');
    return this.studioService.getBundle(tenantId);
  }

  @Put('bundle/:section')
  async updateSection(
    @Param('section') section: string,
    @Body() data: any,
    @Headers('x-tenant-id') tenantId: string
  ) {
    if (!tenantId) throw new BadRequestException('x-tenant-id header is required');
    return this.studioService.updateSection(tenantId, section, data);
  }
}
