import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getSettings(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { knowledgeBundle: true },
    });

    const wahaApiUrl = process.env.WAHA_API_URL || 'https://waha.ingeniodigital.shop';
    const wahaSession = tenant?.wahaSession || process.env.WAHA_SESSION || 'ferreos';
    const aiProvider = process.env.AI_PROVIDER || 'openrouter';
    const aiModel = process.env.AI_MODEL || 'google/gemini-2.5-flash-lite';
    const aiBaseUrl = process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1';

    return {
      tenant: {
        id: tenant?.id,
        name: tenant?.name || 'Mi Empresa',
        wahaSession: tenant?.wahaSession || 'ferreos',
        currentBundleVersion: tenant?.currentBundleVersion || 'v1',
        createdAt: tenant?.createdAt,
      },
      waha: {
        apiUrl: wahaApiUrl,
        session: wahaSession,
        hasApiKey: !!process.env.WAHA_API_KEY,
        status: 'CONNECTED',
      },
      ai: {
        provider: aiProvider,
        model: aiModel,
        baseUrl: aiBaseUrl,
        hasApiKey: !!process.env.AI_API_KEY,
      },
      meta: {
        webhookUrl: '/webhooks/meta',
        verifyTokenConfigured: true,
        supportedChannels: ['whatsapp', 'instagram', 'facebook'],
      },
    };
  }

  async updateTenantSettings(tenantId: string, data: { name?: string; wahaSession?: string }) {
    this.logger.log(`Updating tenant settings for ${tenantId}: ${JSON.stringify(data)}`);
    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.wahaSession && { wahaSession: data.wahaSession }),
      },
    });
    return updated;
  }

  async cleanSlate(tenantId: string) {
    this.logger.warn(`Clean slate requested for tenant ${tenantId}`);
    
    await this.prisma.memoryAuditLog.deleteMany({ where: { tenantId } });
    await this.prisma.businessMemory.deleteMany({ where: { contact: { tenantId } } });
    await this.prisma.task.deleteMany({ where: { contact: { tenantId } } });
    await this.prisma.interaction.deleteMany({ where: { conversation: { contact: { tenantId } } } });
    await this.prisma.conversation.deleteMany({ where: { contact: { tenantId } } });
    await this.prisma.contact.deleteMany({ where: { tenantId } });
    await this.prisma.pendingOutboundMessage.deleteMany({ where: { tenantId } });

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

    await this.prisma.knowledgeBundle.upsert({
      where: { tenantId },
      update: { systemPrompt: emptyBundlePrompt, version: 1 },
      create: { tenantId, systemPrompt: emptyBundlePrompt, version: 1 },
    });

    this.eventEmitter.emit('knowledge-base.updated', { tenantId });

    return { status: 'CLEAN_SLATE_COMPLETED', tenantId };
  }
}
