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
      empresa: "Desconocida",
      tono: "Formal, neutral y de asistencia técnica",
      instrucciones: "Eres un asistente de configuración. Dile al usuario amablemente que el sistema está funcionando pero que el Tenant aún no tiene configurado su Knowledge Bundle en la base de datos. No intentes vender ningún producto ni inventes información comercial."
    };
  }
}
