import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';

@Injectable()
export class KosLoaderService {
  private readonly logger = new Logger(KosLoaderService.name);

  constructor(private readonly prisma: PrismaService) {}

  async load(tenantId: string): Promise<any> {
    try {
      const bundle = await this.prisma.knowledgeBundle.findUnique({
        where: { tenantId }
      });

      if (!bundle || !bundle.systemPrompt) {
        this.logger.warn(`No se encontró Knowledge Bundle para el tenant ${tenantId}`);
        return this.getFallbackBundle();
      }

      this.logger.log(`Knowledge Bundle cargado para tenant ${tenantId} (v${bundle.version})`);
      return bundle.systemPrompt;
    } catch (error) {
      this.logger.error(`Error cargando Knowledge Bundle para tenant ${tenantId}:`, error);
      return this.getFallbackBundle();
    }
  }

  private getFallbackBundle(): any {
    return {
      instrucciones: "El Knowledge Bundle del tenant aún no fue configurado."
    };
  }
}
