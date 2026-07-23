import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { PrismaService } from '../../shared/database/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly prisma: PrismaService
  ) {}

  @Get('debug/dump')
  async dump() {
    const [t, c, co] = await Promise.all([
      this.prisma.tenant.findMany(),
      this.prisma.contact.findMany(),
      this.prisma.conversation.findMany()
    ]);
    return { tenants: t, contacts: c, conversations: co };
  }

  @Get('system-status')
  async getSystemStatus() {
    return this.healthService.getSystemStatus();
  }
}
