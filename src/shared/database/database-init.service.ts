import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * DatabaseInitService
 *
 * Runs once when the application boots.
 * - If NO tenant exists → creates the main tenant with wahaSession = 'default'.
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
            wahaSession: 'default',
            currentBundleVersion: 'v1',
          },
        });
        this.logger.log(
          `✅ Main tenant created: ${tenant.name} (wahaSession: ${tenant.wahaSession})`,
        );
        await this.ensureKnowledgeBundle(tenant.id);
      } else {
        const main = tenants[0];
        if (main.wahaSession !== 'default') {
          await this.prisma.tenant.update({
            where: { id: main.id },
            data: { wahaSession: 'default' },
          });
          this.logger.log(
            `✅ Tenant "${main.name}" patched: wahaSession set to default`,
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
            instrucciones: 'El asistente se encuentra en modo configuración. No tiene conocimientos de negocio aún.',
          },
          version: 1,
        },
      });
      this.logger.log(`✅ KnowledgeBundle created for tenant: ${tenantId}`);
    }
  }
}
