import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class KosLoaderService {
  private readonly logger = new Logger(KosLoaderService.name);
  private readonly cache = new Map<string, { bundle: any; expiresAt: number }>();

  constructor(private readonly prisma: PrismaService) {}

  async load(tenantId: string): Promise<any> {
    this.cleanExpiredCache();
    
    const now = Date.now();
    const cached = this.cache.get(tenantId);

    if (cached) {
      this.logger.log(`Knowledge Bundle cache hit para tenant ${tenantId}`);
      return cached.bundle;
    }

    this.logger.log(`Knowledge Bundle cache miss para tenant ${tenantId}`);

    try {
      const bundle = await this.prisma.knowledgeBundle.findUnique({
        where: { tenantId }
      });

      if (!bundle || !bundle.systemPrompt) {
        this.logger.warn(`No se encontró Knowledge Bundle para el tenant ${tenantId}`);
        return this.getFallbackBundle();
      }

      this.logger.log(`Knowledge Bundle cargado para tenant ${tenantId} (v${bundle.version})`);
      
      const kosData = bundle.systemPrompt;
      let finalBundle = kosData;
      
      if (kosData && typeof kosData === 'object') {
        const rawObj = (kosData as any)._raw || {};
        const { _raw, ...rest } = kosData as any;
        finalBundle = {
          ...rest,
          ...rawObj,
        };
      }

      const ttlMs = parseInt(process.env.KOS_CACHE_TTL_MS || '300000', 10);
      this.cache.set(tenantId, {
        bundle: finalBundle,
        expiresAt: now + ttlMs,
      });

      return finalBundle;
    } catch (error) {
      this.logger.error(`Error cargando Knowledge Bundle para tenant ${tenantId}:`, error);
      return this.getFallbackBundle();
    }
  }

  private cleanExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (value.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }

  private getFallbackBundle(): any {
    return {
      instrucciones: "Tenant sin configuración. No existe un Knowledge Bundle activo para este tenant."
    };
  }

  @OnEvent('knowledge-base.updated', { async: true })
  handleKnowledgeBaseUpdated(payload: { tenantId: string }) {
    this.cache.delete(payload.tenantId);
    this.logger.log(`Knowledge Bundle cache invalidado para tenant ${payload.tenantId} debido a actualización desde BackOffice.`);
  }
}
