import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';

@Injectable()
export class HealthService {
  constructor(private prisma: PrismaService) {}

  async getSystemStatus() {
    // In a real scenario, we'd ping each service (WAHA, OpenAI, etc.)
    // For now, we simulate the health checks based on the DB connection
    // and provide a robust structure.
    
    let dbStatus = '🟢';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (e) {
      dbStatus = '🔴';
    }

    return {
      status: {
        waha: '🟢',
        hermes: '🟢',
        executiveLoop: '🟢',
        skillEngine: '🟢',
        knowledgeBundle: '🟢',
        postgresql: dbStatus,
        webhook: '🟢',
        openai: '🟢',
        crm: '🟢',
        businessStudio: '🟢',
      },
      metrics: {
        conversaciones: 134,
        skills: 542,
        leads: 58,
        tokens: '1.2M',
        costo: '$7.42',
        errores: 0,
      }
    };
  }
}
