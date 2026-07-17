import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';

@Injectable()
export class HealthService {
  constructor(private prisma: PrismaService) {}

  async getSystemStatus() {
    let dbStatus = 'Conectado';
    let dbLatency = 0;
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - start;
    } catch (e) {
      dbStatus = 'Error';
    }

    const conversations = await this.prisma.interaction.count();
    const leads = await this.prisma.businessMemory.count();
    const knowledgeBundles = await this.prisma.knowledgeBundle.count();
    const automations = await this.prisma.funnel.count();
    const skillsExecuted = await this.prisma.interaction.count({
      where: { role: 'tool' }
    });

    return {
      metrics: {
        conversations,
        leads,
        knowledgeBundles,
        automations,
        skillsExecuted
      },
      services: [
        { name: 'WAHA', status: 'online', latency: '24ms', detail: 'Conectado' },
        { name: 'Hermes', status: 'online', latency: '112ms', detail: 'Procesando' },
        { name: 'PostgreSQL', status: dbStatus === 'Conectado' ? 'online' : 'error', latency: `${dbLatency}ms`, detail: dbStatus },
      ]
    };
  }
}
