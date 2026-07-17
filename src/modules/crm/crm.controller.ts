import { Controller, Get, Param, Patch, Query, Body, Headers, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';

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
  // Penalizar si no ha habido interacción reciente
  if (memory?.lastInteraction) {
    const daysSince = (Date.now() - new Date(memory.lastInteraction).getTime()) / 86400000;
    if (daysSince > 7) score -= 10;
    if (daysSince > 30) score -= 20;
  }
  return Math.max(0, Math.min(100, score));
}

@Controller('crm')
export class CrmController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /crm/leads
   * Devuelve todos los leads agrupados en Kanban o como lista.
   * Query: ?search=&stage=&tenantId=
   */
  @Get('leads')
  async getLeads(
    @Headers('x-tenant-id') tenantId: string,
    @Query('search') search?: string,
    @Query('stage') stage?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    if (!tenantId) throw new BadRequestException('x-tenant-id header is required');
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where: any = { tenantId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { memory: { company: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const contacts = await this.prisma.contact.findMany({
      where,
      skip,
      take,
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

      // Calcular tiempo sin responder
      let hoursSinceLastContact: number | null = null;
      if (c.memory?.lastInteraction) {
        hoursSinceLastContact = Math.floor(
          (Date.now() - new Date(c.memory.lastInteraction).getTime()) / 3600000,
        );
      }

      // Mapear leadStatus → kanban stage
      const statusToStage: Record<string, string> = {
        NEW: 'Nuevo',
        CONTACTED: 'Contactado',
        HOT: 'Interesado',
        WARM: 'Interesado',
        DEMO: 'Demo',
        OFFER: 'Oferta',
        SALE: 'Venta',
        CLIENT: 'Cliente',
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

    // Si pide stage específico, filtrar
    const filtered = stage ? leads.filter((l) => l.kanbanStage === stage) : leads;

    // Agrupar en kanban
    const kanban: Record<string, typeof leads> = {};
    KANBAN_STAGES.forEach((s) => (kanban[s] = []));
    filtered.forEach((l) => {
      if (kanban[l.kanbanStage]) kanban[l.kanbanStage].push(l);
      else kanban['Nuevo'].push(l);
    });

    return { total, page: parseInt(page), kanban };
  }

  /**
   * GET /crm/leads/:id
   * Detalle completo de un lead con historial de conversaciones y memoria.
   */
  @Get('leads/:id')
  async getLead(@Param('id') id: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
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
  ) {
    const stageToStatus: Record<string, string> = {
      Nuevo: 'NEW',
      Contactado: 'CONTACTED',
      Interesado: 'WARM',
      Demo: 'DEMO',
      Oferta: 'OFFER',
      Venta: 'SALE',
      Cliente: 'CLIENT',
    };

    const leadStatus = stageToStatus[body.stage] ?? 'NEW';

    await this.prisma.businessMemory.upsert({
      where: { contactId: id },
      update: { leadStatus },
      create: { contactId: id, leadStatus },
    });

    return { id, kanbanStage: body.stage, leadStatus };
  }

  /**
   * PATCH /crm/leads/:id/owner
   * Asigna propietario al lead.
   */
  @Patch('leads/:id/owner')
  async patchOwner(
    @Param('id') id: string,
    @Body() body: { owner: string },
  ) {
    // Guardamos el owner como un tag especial hasta que el schema tenga campo owner
    const memory = await this.prisma.businessMemory.findUnique({ where: { contactId: id } });
    const currentTags = memory?.tags ?? [];
    const filteredTags = currentTags.filter((t: string) => !t.startsWith('owner:'));
    filteredTags.push(`owner:${body.owner}`);

    await this.prisma.businessMemory.upsert({
      where: { contactId: id },
      update: { tags: filteredTags },
      create: { contactId: id, tags: filteredTags },
    });

    return { id, owner: body.owner };
  }
}
