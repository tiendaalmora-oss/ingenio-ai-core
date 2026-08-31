import { Controller, Get, Post, Delete, Param, Patch, Query, Body, BadRequestException, NotFoundException, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { AdminApiKeyGuard } from '../../shared/guards/admin-api-key.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { TenantId } from '../../shared/decorators/tenant-id.decorator';

const KANBAN_STAGES = ['Nuevo', 'Contactado', 'Interesado', 'Demo', 'Oferta', 'Venta', 'Cliente'];

/** Calcula un AI-score simple basado en actividad real */
function computeScore(memory: any, convCount: number, interactionCount: number): number {
  let score = 30; // base
  if (memory?.interests?.length > 0) score += 15;
  if (memory?.company) score += 10;
  if (memory?.leadStatus === 'HOT') score += 25;
  if (memory?.leadStatus === 'WARM') score += 15;
  if (memory?.objections?.length === 0) score += 10;
  if (convCount > 1) score += 5;
  if (interactionCount > 10) score += 10;
  if (memory?.lastInteraction) {
    const daysSince = (Date.now() - new Date(memory.lastInteraction).getTime()) / 86400000;
    if (daysSince > 7) score -= 10;
    if (daysSince > 30) score -= 20;
  }
  return Math.max(0, Math.min(100, score));
}

@Controller('crm')
@UseGuards(AdminApiKeyGuard, TenantGuard)
export class CrmController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /crm/leads
   * Devuelve todos los leads agrupados en Kanban o como lista.
   */
  @Get('leads')
  async getLeads(
    @TenantId() tenantId: string,
    @Query('search') search?: string,
    @Query('stage') stage?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '100',
  ) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where: any = { tenantId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { memory: { company: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const contacts = await this.prisma.contact.findMany({
      where,
      skip,
      take,
      orderBy: { id: 'desc' },
      include: {
        memory: true,
        conversations: {
          include: {
            _count: { select: { interactions: true } },
            activeFunnel: true,
            interactions: {
              orderBy: { timestamp: 'desc' },
              take: 1,
            },
          },
        },
        tasks: { where: { status: 'PENDING' }, take: 3 },
      },
    });

    const total = await this.prisma.contact.count({ where });

    const leads = contacts.map((c) => {
      const totalInteractions = c.conversations.reduce(
        (sum, conv) => sum + conv._count.interactions,
        0,
      );
      const lastMsg = c.conversations
        .flatMap((cv) => cv.interactions)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

      const score = computeScore(c.memory, c.conversations.length, totalInteractions);
      const activeFunnel = c.conversations.find((cv) => cv.activeFunnel)?.activeFunnel;

      let hoursSinceLastContact: number | null = null;
      if (c.memory?.lastInteraction) {
        hoursSinceLastContact = Math.floor(
          (Date.now() - new Date(c.memory.lastInteraction).getTime()) / 3600000,
        );
      }

      const statusToStage: Record<string, string> = {
        NEW: 'Nuevo',
        COLD: 'Nuevo',
        CONTACTED: 'Contactado',
        WARM: 'Interesado',
        HOT: 'Oferta',
        DEMO: 'Demo',
        OFFER: 'Oferta',
        SALE: 'Venta',
        CLOSED: 'Venta',
        CLIENT: 'Cliente',
        PAGADO: 'Venta',
      };
      
      const kanbanStage =
        statusToStage[c.memory?.leadStatus ?? ''] ??
        (c.conversations.length > 0 ? 'Contactado' : 'Nuevo');

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        company: c.memory?.company ?? null,
        leadStatus: c.memory?.leadStatus ?? 'NEW',
        kanbanStage,
        score,
        interests: c.memory?.interests ?? [],
        objections: c.memory?.objections ?? [],
        tags: c.memory?.tags ?? [],
        lastInteraction: c.memory?.lastInteraction ?? null,
        hoursSinceLastContact,
        conversationCount: c.conversations.length,
        interactionCount: totalInteractions,
        activeFunnelId: activeFunnel?.funnelId ?? null,
        activeFunnelStep: activeFunnel?.currentStepId ?? null,
        pendingTasks: c.tasks.length,
        lastMessageContent: lastMsg?.content ?? null,
        lastMessageDirection: lastMsg?.direction ?? null,
      };
    });

    const filtered = stage ? leads.filter((l) => l.kanbanStage === stage) : leads;

    const kanban: Record<string, typeof leads> = {};
    KANBAN_STAGES.forEach((s) => (kanban[s] = []));
    filtered.forEach((l) => {
      if (kanban[l.kanbanStage]) kanban[l.kanbanStage].push(l);
      else kanban['Nuevo'].push(l);
    });

    return { total, page: parseInt(page), kanban, leads };
  }

  /**
   * POST /crm/leads
   * Crear prospecto manualmente desde el CRM.
   */
  @Post('leads')
  async createLead(
    @TenantId() tenantId: string,
    @Body() body: { name: string; phone: string; company?: string; interests?: string[]; tags?: string[]; leadStatus?: string },
  ) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    if (!body.name || !body.phone) throw new BadRequestException('name and phone are required');

    const phoneNormalized = body.phone.replace(/[^0-9]/g, '');

    const contact = await this.prisma.contact.upsert({
      where: {
        tenantId_phoneNormalized: { tenantId, phoneNormalized },
      },
      update: {
        name: body.name,
        phone: body.phone,
      },
      create: {
        tenantId,
        name: body.name,
        phone: body.phone,
        phoneNormalized,
        externalId: `${phoneNormalized}@c.us`,
      },
    });

    await this.prisma.businessMemory.upsert({
      where: { contactId: contact.id },
      update: {
        name: body.name,
        company: body.company || null,
        interests: body.interests || [],
        tags: body.tags || [],
        leadStatus: body.leadStatus || 'COLD',
      },
      create: {
        contactId: contact.id,
        name: body.name,
        company: body.company || null,
        interests: body.interests || [],
        tags: body.tags || [],
        leadStatus: body.leadStatus || 'COLD',
      },
    });

    return { success: true, leadId: contact.id };
  }

  /**
   * GET /crm/leads/:id
   * Detalle completo de un lead con historial de conversaciones y memoria.
   */
  @Get('leads/:id')
  async getLead(@Param('id') id: string, @TenantId() tenantId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, tenantId },
      include: {
        memory: true,
        conversations: {
          include: {
            interactions: {
              orderBy: { timestamp: 'asc' },
              take: 100,
            },
            activeFunnel: true,
            _count: { select: { interactions: true } },
          },
          orderBy: { id: 'desc' },
        },
        tasks: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!contact) return { error: 'Lead not found' };

    const totalInteractions = contact.conversations.reduce(
      (sum, c) => sum + c._count.interactions,
      0,
    );
    const score = computeScore(contact.memory, contact.conversations.length, totalInteractions);

    return {
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
      company: contact.memory?.company ?? null,
      leadStatus: contact.memory?.leadStatus ?? 'NEW',
      score,
      interests: contact.memory?.interests ?? [],
      objections: contact.memory?.objections ?? [],
      tags: contact.memory?.tags ?? [],
      lastInteraction: contact.memory?.lastInteraction ?? null,
      conversations: contact.conversations.map((c) => ({
        id: c.id,
        status: c.status,
        messageCount: c._count.interactions,
        activeFunnel: c.activeFunnel
          ? { funnelId: c.activeFunnel.funnelId, step: c.activeFunnel.currentStepId }
          : null,
        messages: c.interactions.map((m) => ({
          id: m.id,
          direction: m.direction,
          content: m.content,
          role: m.role,
          timestamp: m.timestamp,
        })),
      })),
      tasks: contact.tasks,
    };
  }

  /**
   * PATCH /crm/leads/:id/stage
   * Mueve un lead a otro stage del kanban.
   */
  @Patch('leads/:id/stage')
  async patchStage(
    @Param('id') id: string,
    @Body() body: { stage: string },
    @TenantId() tenantId: string,
  ) {
    const contact = await this.prisma.contact.findFirst({ where: { id, tenantId } });
    if (!contact) throw new NotFoundException('Lead not found');

    const stageToStatus: Record<string, string> = {
      Nuevo: 'COLD',
      Contactado: 'COLD',
      Interesado: 'WARM',
      Demo: 'WARM',
      Oferta: 'HOT',
      Venta: 'CLOSED',
      Cliente: 'CLOSED',
    };

    const leadStatus = stageToStatus[body.stage] ?? 'COLD';

    await this.prisma.businessMemory.upsert({
      where: { contactId: id },
      update: { leadStatus },
      create: { contactId: id, leadStatus },
    });

    return { id, kanbanStage: body.stage, leadStatus };
  }

  /**
   * PATCH /crm/leads/:id/memory
   * Actualizar memoria y datos de un lead.
   */
  @Patch('leads/:id/memory')
  async patchMemory(
    @Param('id') id: string,
    @Body() body: { name?: string; company?: string; interests?: string[]; tags?: string[]; leadStatus?: string; objections?: string[] },
    @TenantId() tenantId: string,
  ) {
    const contact = await this.prisma.contact.findFirst({ where: { id, tenantId } });
    if (!contact) throw new NotFoundException('Lead not found');

    if (body.name) {
      await this.prisma.contact.update({
        where: { id },
        data: { name: body.name },
      });
    }

    const memory = await this.prisma.businessMemory.upsert({
      where: { contactId: id },
      update: {
        name: body.name,
        company: body.company,
        interests: body.interests,
        tags: body.tags,
        leadStatus: body.leadStatus,
        objections: body.objections,
      },
      create: {
        contactId: id,
        name: body.name,
        company: body.company,
        interests: body.interests || [],
        tags: body.tags || [],
        leadStatus: body.leadStatus || 'COLD',
        objections: body.objections || [],
      },
    });

    return { id, memory };
  }

  /**
   * GET /crm/alerts
   * Devuelve alertas en tiempo real para el operador humano (Pagos confirmados, Traspasos a Asesor, Leads Hot).
   */
  @Get('alerts')
  async getAlerts(@TenantId() tenantId: string) {
    if (!tenantId) throw new BadRequestException('tenantId is required');

    const [handoffConvs, closedLeads, hotLeads] = await Promise.all([
      // 1. Chats que requieren asesor humano
      this.prisma.conversation.findMany({
        where: {
          contact: { tenantId },
          status: 'HANDOFF',
        },
        include: {
          contact: { include: { memory: true } },
          interactions: { orderBy: { timestamp: 'desc' }, take: 1 },
        },
        orderBy: { id: 'desc' },
        take: 20,
      }),
      // 2. Pagos confirmados recientes
      this.prisma.contact.findMany({
        where: {
          tenantId,
          memory: {
            OR: [
              { leadStatus: 'CLOSED' },
              { tags: { has: 'PAGO_CONFIRMADO' } },
            ],
          },
        },
        include: {
          memory: true,
          conversations: {
            include: {
              interactions: { orderBy: { timestamp: 'desc' }, take: 1 },
            },
            take: 1,
          },
        },
        orderBy: { id: 'desc' },
        take: 20,
      }),
      // 3. Leads muy interesados (HOT)
      this.prisma.contact.findMany({
        where: {
          tenantId,
          memory: { leadStatus: 'HOT' },
        },
        include: {
          memory: true,
          conversations: {
            include: {
              interactions: { orderBy: { timestamp: 'desc' }, take: 1 },
            },
            take: 1,
          },
        },
        orderBy: { id: 'desc' },
        take: 10,
      }),
    ]);

    const alerts: any[] = [];

    // Formatear alertas de Pagos
    for (const contact of closedLeads) {
      const conv = contact.conversations[0];
      const lastMsg = conv?.interactions[0];
      alerts.push({
        id: `pay-${contact.id}`,
        type: 'PAYMENT',
        priority: 'CRITICAL',
        title: '💰 Pago Confirmado',
        description: `${contact.name || contact.phone || 'Cliente'} completó su pago y compra.`,
        contactId: contact.id,
        contactName: contact.name || 'Cliente',
        contactPhone: contact.phone || contact.externalId,
        conversationId: conv?.id || null,
        timestamp: lastMsg?.timestamp || contact.memory?.updatedAt || new Date(),
      });
    }

    // Formatear alertas de Asesor Humano (Handoff)
    for (const conv of handoffConvs) {
      const lastMsg = conv.interactions[0];
      const tags = (conv.contact.memory?.tags as string[]) || [];
      const isExplicitHumanRequest = tags.includes('HANDOFF_HUMANO') || tags.includes('ASESOR_SOLICITADO');
      const isWaitingHumanReply = lastMsg?.direction === 'INBOUND';

      // Si el operador ya respondió el último mensaje, la alerta ya fue atendida
      const priority = isWaitingHumanReply ? 'HIGH' : 'LOW';

      alerts.push({
        id: `handoff-${conv.id}`,
        type: 'HANDOFF',
        priority,
        title: isExplicitHumanRequest ? '👤 Solicitud de Asesor Humano' : '⏸️ Bot en Pausa (Atención Manual)',
        description: isExplicitHumanRequest
          ? `${conv.contact.name || conv.contact.phone || 'Prospecto'} solicitó hablar con un asesor: "${lastMsg?.content?.substring(0, 60) || 'Esperando respuesta...'}"`
          : `${conv.contact.name || conv.contact.phone || 'Prospecto'} requiere atención del operador: "${lastMsg?.content?.substring(0, 60) || 'Pausado'}"`,
        contactId: conv.contact.id,
        contactName: conv.contact.name || 'Prospecto',
        contactPhone: conv.contact.phone || conv.contact.externalId,
        conversationId: conv.id,
        isWaitingReply: isWaitingHumanReply,
        timestamp: lastMsg?.timestamp || new Date(),
      });
    }

    // Formatear alertas de Leads Calientes (HOT)
    for (const contact of hotLeads) {
      const conv = contact.conversations[0];
      const lastMsg = conv?.interactions[0];
      alerts.push({
        id: `hot-${contact.id}`,
        type: 'HOT_LEAD',
        priority: 'MEDIUM',
        title: '🔥 Lead Caliente (Listo para Cierre)',
        description: `${contact.name || contact.phone || 'Prospecto'} tiene alta intención de compra.`,
        contactId: contact.id,
        contactName: contact.name || 'Prospecto',
        contactPhone: contact.phone || contact.externalId,
        conversationId: conv?.id || null,
        timestamp: lastMsg?.timestamp || contact.memory?.updatedAt || new Date(),
      });
    }

    // Ordenar alertas por fecha descendente
    alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Solo se consideran urgentes aquellas que requieren acción inmediata (Pagos o Handoffs sin responder)
    const urgentCount = alerts.filter((a) => a.priority === 'CRITICAL' || a.priority === 'HIGH').length;

    return {
      urgentCount,
      totalAlerts: alerts.length,
      alerts,
    };
  }

  /**
   * DELETE /crm/leads/:id
   * Eliminar un contacto y todos sus datos relacionados.
   */
  @Delete('leads/:id')
  async deleteLead(@Param('id') id: string, @TenantId() tenantId: string) {
    const contact = await this.prisma.contact.findFirst({ where: { id, tenantId } });
    if (!contact) throw new NotFoundException('Lead not found');

    // 1. Borrar interacciones
    const convos = await this.prisma.conversation.findMany({ where: { contactId: id } });
    const convoIds = convos.map((c) => c.id);
    if (convoIds.length > 0) {
      await this.prisma.interaction.deleteMany({ where: { conversationId: { in: convoIds } } });
      await this.prisma.activeFunnel.deleteMany({ where: { conversationId: { in: convoIds } } });
      await this.prisma.conversation.deleteMany({ where: { id: { in: convoIds } } });
    }

    // 2. Borrar tareas, memoria y mensajes pendientes
    await this.prisma.task.deleteMany({ where: { contactId: id } });
    await this.prisma.memoryAuditLog.deleteMany({ where: { contactId: id } });
    await this.prisma.businessMemory.deleteMany({ where: { contactId: id } });
    await this.prisma.pendingOutboundMessage.deleteMany({ where: { contactId: id } });

    // 3. Borrar contacto
    await this.prisma.contact.delete({ where: { id } });

    return { success: true, deletedId: id };
  }
}
