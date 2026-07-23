import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * DatabaseInitService
 *
 * Runs once when the application boots.
 * - If NO tenant exists → creates the main tenant with wahaSession = 'ferreos'.
 * - If tenant exists BUT wahaSession is wrong → patches it.
 * - Never creates a duplicate tenant.
 * - Never relies on ts-node or external seed scripts.
 */
@Injectable()
export class DatabaseInitService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseInitService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    await this.initializeTenant();
  }

  private async initializeTenant() {
    try {
      const tenants = await this.prisma.tenant.findMany();

      if (tenants.length === 0) {
        this.logger.log('No tenants found. Creating main tenant...');
        const tenant = await this.prisma.tenant.create({
          data: {
            name: 'Default Tenant',
            wahaSession: 'ferreos',
            currentBundleVersion: 'v1',
          },
        });
        this.logger.log(
          `✅ Main tenant created: ${tenant.name} (wahaSession: ${tenant.wahaSession})`,
        );
        await this.ensureKnowledgeBundle(tenant.id);
      } else {
        const main = tenants[0];
        if (main.wahaSession !== 'ferreos') {
          await this.prisma.tenant.update({
            where: { id: main.id },
            data: { wahaSession: 'ferreos' },
          });
          this.logger.log(
            `✅ Tenant "${main.name}" patched: wahaSession set to ferreos`,
          );
        } else {
          this.logger.log(
            `✅ Tenant "${main.name}" already has correct wahaSession`,
          );
        }
        await this.ensureKnowledgeBundle(main.id);
      }
    } catch (err: any) {
      this.logger.error(`❌ Database initialization failed: ${err.message}`);
    }
  }

  private async ensureKnowledgeBundle(tenantId: string) {
    const existing = await this.prisma.knowledgeBundle.findUnique({
      where: { tenantId },
    });
    if (!existing) {
      await this.prisma.knowledgeBundle.create({
        data: {
          tenantId,
          systemPrompt: {
            empresa: 'FerreOS',
            descripcion: 'Sistema de gestión para ferreterías.',
            tono: 'Profesional, conciso y vendedor.',
            instrucciones:
              'Eres el asistente virtual de FerreOS. Responde preguntas sobre precios y características. Si el usuario quiere comprar, pídele sus datos de contacto.',
          },
          version: 1,
        },
      });
      this.logger.log(`✅ KnowledgeBundle created for tenant: ${tenantId}`);
    }
  }
}
