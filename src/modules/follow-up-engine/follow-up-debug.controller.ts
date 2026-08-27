import { Controller, Get, Post, Body, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { FollowUpEngineService } from './services/follow-up-engine.service';
import { WahaAdapterService } from '../outbound-engine/services/waha-adapter.service';

@Controller('debug/follow-up')
export class FollowUpDebugController {
  private readonly logger = new Logger(FollowUpDebugController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly followUpEngine: FollowUpEngineService,
    private readonly wahaAdapter: WahaAdapterService,
  ) {}

  /**
   * GET /debug/follow-up/audit
   * Auditoría profunda de configuración, conversaciones, reglas de seguimiento y estado de WAHA.
   */
  @Get('audit')
  async runAudit() {
    // 1. Sesiones activas en WAHA
    const wahaSessions = await this.wahaAdapter.getWahaSessions();

    // 2. Tenants y sus bases de conocimiento
    const tenants = await this.prisma.tenant.findMany({
      include: {
        knowledgeBundle: true,
      },
    });

    const tenantAudits: any[] = [];
    for (const t of tenants) {
      const bundle = t.knowledgeBundle;
      const systemPrompt: any = bundle?.systemPrompt || {};
      const rawData: any = typeof systemPrompt === 'string' ? JSON.parse(systemPrompt) : (systemPrompt['_raw'] || systemPrompt);
      const rawSeguimientos = rawData['seguimientos'] || rawData['followups'] || systemPrompt['followups'] || systemPrompt['seguimientos'] || rawData['scriptsComerciales'];

      tenantAudits.push({
        tenantId: t.id,
        wahaSessionStored: t.wahaSession,
        hasBundle: !!bundle,
        rawSeguimientosFound: !!rawSeguimientos,
        rawSeguimientosContent: rawSeguimientos || 'No configurado',
      });
    }

    // 3. Conversaciones activas y tiempo transcurrido
    const activeConversations = await this.prisma.conversation.findMany({
      where: {
        status: { in: ['NEW', 'ACTIVE'] },
      },
      include: {
        contact: {
          include: { memory: true },
        },
        interactions: {
          orderBy: { timestamp: 'desc' },
          take: 2,
        },
      },
    });

    const conversationAudits = activeConversations.map(c => {
      const lastMsg = c.interactions[0];
      const elapsedMs = lastMsg ? Date.now() - lastMsg.timestamp.getTime() : null;
      const elapsedMinutes = elapsedMs ? Math.round(elapsedMs / 60000) : null;

      return {
        conversationId: c.id,
        status: c.status,
        contact: {
          id: c.contact.id,
          phone: c.contact.phone,
          name: c.contact.name,
          leadStatus: c.contact.memory?.leadStatus || 'UNKNOWN',
        },
        lastInteraction: lastMsg ? {
          direction: lastMsg.direction,
          content: lastMsg.content?.substring(0, 60),
          timestamp: lastMsg.timestamp,
          elapsedMinutes: `${elapsedMinutes} min atrás`,
        } : 'Sin interacciones',
      };
    });

    // 4. Últimos mensajes salientes encolados / enviados / fallidos
    const recentOutbound = await this.prisma.pendingOutboundMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 15,
    });

    return {
      serverTime: new Date().toISOString(),
      waha: {
        apiUrl: process.env.WAHA_API_URL || 'No configurado',
        configuredSessionEnv: process.env.WAHA_SESSION || 'None (usando tenant o default)',
        activeSessions: wahaSessions,
      },
      tenants: tenantAudits,
      activeConversationsCount: activeConversations.length,
      conversations: conversationAudits,
      recentOutboundMessages: recentOutbound.map(m => ({
        id: m.id,
        contactId: m.contactId,
        followUpId: m.followUpId,
        status: m.status,
        retries: m.retries,
        createdAt: m.createdAt,
        sentAt: m.sentAt,
        messageSnippet: m.message?.substring(0, 60),
        providerResponse: m.providerResponse,
      })),
    };
  }

  /**
   * POST /debug/follow-up/trigger
   * Fuerza la ejecución inmediata del motor de evaluación de seguimientos.
   */
  @Post('trigger')
  async triggerEvaluation() {
    this.logger.log('Disparando evaluación manual del Follow-Up Engine...');
    const result = await this.followUpEngine.evaluateFollowUps();
    return {
      message: 'Evaluación manual completada',
      report: result,
    };
  }

  /**
   * POST /debug/follow-up/send-test
   * Envía un mensaje de prueba directo a un número de WhatsApp para comprobar la conexión con WAHA.
   */
  @Post('send-test')
  async sendTestMessage(@Body() body: { phone: string; message?: string }) {
    if (!body.phone) {
      return { error: 'El campo phone es obligatorio (ej: "584121234567")' };
    }

    const testContent = body.message || `🧪 Mensaje de prueba de Ingenio AI enviado a las ${new Date().toLocaleTimeString()} ✅`;
    const tenants = await this.prisma.tenant.findMany({ take: 1 });
    const tenantId = tenants[0]?.id || 'tenant-default';

    try {
      const result = await this.wahaAdapter.sendMessage(tenantId, body.phone, testContent);
      return {
        status: 'SUCCESS',
        phone: body.phone,
        message: testContent,
        wahaMessageId: result,
      };
    } catch (e: any) {
      return {
        status: 'ERROR',
        phone: body.phone,
        error: e.message,
      };
    }
  }
}
