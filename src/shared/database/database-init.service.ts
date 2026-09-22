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
      const targetSession = process.env.WAHA_SESSION || 'ferreos';
      const tenants = await this.prisma.tenant.findMany();

      if (tenants.length === 0) {
        this.logger.log('No tenants found. Creating main tenant...');
        const tenant = await this.prisma.tenant.create({
          data: {
            name: 'Default Tenant',
            wahaSession: targetSession,
            currentBundleVersion: 'v1',
          },
        });
        this.logger.log(
          `✅ Main tenant created: ${tenant.name} (wahaSession: ${tenant.wahaSession})`,
        );
        await this.ensureKnowledgeBundle(tenant.id);
      } else {
        const alreadyWithTarget = tenants.find((t) => t.wahaSession === targetSession);
        if (alreadyWithTarget) {
          this.logger.log(
            `✅ Tenant "${alreadyWithTarget.name}" (${alreadyWithTarget.id}) already has correct wahaSession (${targetSession})`,
          );
          await this.ensureKnowledgeBundle(alreadyWithTarget.id);
        } else {
          const prodTenant = tenants.find((t) => t.id === 'dba1c54c-89c6-41e9-ae9d-03613377a5b3') || tenants[0];
          await this.prisma.tenant.update({
            where: { id: prodTenant.id },
            data: { wahaSession: targetSession },
          });
          this.logger.log(
            `✅ Tenant "${prodTenant.name}" patched: wahaSession set to ${targetSession}`,
          );
          await this.ensureKnowledgeBundle(prodTenant.id);
        }
      }
    } catch (err: any) {
      this.logger.error(`❌ Database initialization failed: ${err.message}`);
    }
  }

  private async ensureKnowledgeBundle(tenantId: string) {
    const emptyBundlePrompt = {
      _raw: {
        identidad: { nombre: 'Asistente Virtual', tono: 'Profesional, empático y vendedor' },
        empresa: { nombre: '', descripcion: '', sitioWeb: '' },
        productos: [],
        categorias: [],
        servicios: [],
        faqs: [],
        objeciones: [],
        scriptsComerciales: [],
        promociones: [],
        seguimientos: [],
        soporte: [],
        politicasAtencion: [],
      },
      instrucciones: 'El asistente se encuentra listo para configurar. Carga tus productos y servicios desde el Business Studio.',
    };

    const existing = await this.prisma.knowledgeBundle.findUnique({
      where: { tenantId },
    });

    if (!existing) {
      await this.prisma.knowledgeBundle.create({
        data: {
          tenantId,
          systemPrompt: emptyBundlePrompt,
          version: 1,
        },
      });
      this.logger.log(`✅ KnowledgeBundle created for tenant: ${tenantId}`);
    } else {
      const prompt: any = existing.systemPrompt || {};
      if (prompt.empresa === 'FerreOS' || JSON.stringify(prompt).includes('FerreOS')) {
        await this.prisma.knowledgeBundle.update({
          where: { tenantId },
          data: {
            systemPrompt: emptyBundlePrompt,
            version: { increment: 1 },
          },
        });
        this.logger.log(`🧹 Legacy FerreOS KnowledgeBundle reset to clean slate for tenant: ${tenantId}`);
      }
    }
  }
}
