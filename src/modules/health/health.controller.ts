import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController { @Get('debug/dump') async dump() { const [t, c, co] = await Promise.all([this.prisma.tenant.findMany(), this.prisma.contact.findMany(), this.prisma.conversation.findMany()]); return { tenants: t, contacts: c, conversations: co }; }
  constructor(private readonly healthService: HealthService) {}

  @Get('system-status')
  async getSystemStatus() {
    return this.healthService.getSystemStatus();
  }
}
