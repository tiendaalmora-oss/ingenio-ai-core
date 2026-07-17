import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { InteractionReceivedEvent } from '../conversation';

@Injectable()
export class FunnelEngineService {
  private readonly logger = new Logger(FunnelEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Legacy Context Injector removed in favor of direct Execution Engine
  async findMatchingFunnel(payload: InteractionReceivedEvent): Promise<any | null> {
    const { tenantId, content } = payload;
    // Búsqueda simplificada: si el funnel tiene un trigger "ANY" o la palabra coincide
    const funnels = await this.prisma.funnel.findMany({
      where: { tenantId, isActive: true }
    });

    for (const funnel of funnels) {
      if (funnel.trigger === 'ANY' || content.toLowerCase().includes(funnel.trigger.toLowerCase())) {
        this.logger.log(`Funnel coincidente encontrado: ${funnel.name}`);
        return funnel;
      }
    }
    return null;
  }
}
