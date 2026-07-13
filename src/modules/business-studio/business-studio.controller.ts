import { Controller, Get, Put, Param, Body, Headers } from '@nestjs/common';
import { BusinessStudioService } from './business-studio.service';

@Controller('business-studio')
export class BusinessStudioController {
  constructor(private readonly studioService: BusinessStudioService) {}

  @Get('bundle')
  async getBundle(@Headers('x-tenant-id') headerTenant: string) {
    // For MVP, we use the header or default to ferreos
    const tenantId = headerTenant || 'ferreos';
    return this.studioService.getBundle(tenantId);
  }

  @Put('bundle/:section')
  async updateSection(
    @Param('section') section: string,
    @Body() data: any,
    @Headers('x-tenant-id') headerTenant: string
  ) {
    const tenantId = headerTenant || 'ferreos';
    return this.studioService.updateSection(tenantId, section, data);
  }
}
