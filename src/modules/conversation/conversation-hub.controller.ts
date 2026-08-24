import { Controller, Get, Post, Patch, Param, Query, Body, BadRequestException, Logger, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { WahaAdapterService } from '../outbound-engine/services/waha-adapter.service';
import { AdminApiKeyGuard } from '../../shared/guards/admin-api-key.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { TenantId } from '../../shared/decorators/tenant-id.decorator';

@Controller('conversations')
@UseGuards(AdminApiKeyGuard, TenantGuard)
export class ConversationHubController {
  private readonly logger = new Logger(ConversationHubController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wahaAdapter: WahaAdapterService,
  ) {}

  /**
   * GET /conversations
   * Lista conversaciones del tenant con paginación, búsqueda y filtro de estado.
   */
  @Get()
  async listConversations(
    @TenantId() tenantId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where: any = {
      contact: { tenantId },
    };
    if (status) where.status = status;
    if (search) {
      where.contact = {
        ...where.contact,
        name: { contains: search, mode: 'insensitive' },
      };
    }

    const [total, conversations] = await Promise.all([
      this.prisma.conversation.count({ where }),
      this.prisma.conversation.findMany({
        where,
        skip,
        take,
        orderBy: { id: 'desc' },
        include: {
          contact: {
            include: { memory: true },
          },
          interactions: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
          _count: { select: { interactions: true } },
        },
      }),
    ]);

    const responseData = {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      data: conversations.map((c) => ({
        id: c.id,
        status: c.status,
        contactId: c.contactId,
        contactName: c.contact.name,
        contactPhone: c.contact.phone || c.contact.externalId,
        leadStatus: c.contact.memory?.leadStatus ?? null,
        messageCount: c._count.interactions,
        lastMessage: c.interactions[0]
          ? {
              content: c.interactions[0].content,
              direction: c.interactions[0].direction,
              role: c.interactions[0].role,
              timestamp: c.interactions[0].timestamp,
            }
          : null,
      })),
    };

    return responseData;
  }

  /**
   * GET /conversations/:id
   * Detalle de una conversación con datos del lead y memoria de negocio.
   */
  @Get(':id')
  async getConversation(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id, contact: { tenantId } },
      include: {
        contact: { include: { memory: true } },
        activeFunnel: true,
        _count: { select: { interactions: true } },
      },
    });
    if (!conv) throw new BadRequestException('Conversación no encontrada');

    return {
      id: conv.id,
      status: conv.status,
      contact: {
        id: conv.contact.id,
        name: conv.contact.name,
        phone: conv.contact.phone || conv.contact.externalId,
        leadStatus: conv.contact.memory?.leadStatus,
        company: conv.contact.memory?.company,
        interests: conv.contact.memory?.interests ?? [],
        objections: conv.contact.memory?.objections ?? [],
        tags: conv.contact.memory?.tags ?? [],
        lastInteraction: conv.contact.memory?.lastInteraction,
      },
      activeFunnel: conv.activeFunnel
        ? { funnelId: conv.activeFunnel.funnelId, step: conv.activeFunnel.currentStepId }
        : null,
      messageCount: conv._count.interactions,
    };
  }

  /**
   * GET /conversations/:id/messages
   * Historial completo de mensajes e interacciones.
   */
  @Get(':id/messages')
  async getMessages(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '100',
  ) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id, contact: { tenantId } },
    });
    if (!conv) throw new BadRequestException('Conversación no encontrada');

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [total, messages] = await Promise.all([
      this.prisma.interaction.count({ where: { conversationId: id } }),
      this.prisma.interaction.findMany({
        where: { conversationId: id },
        orderBy: { timestamp: 'asc' },
        skip,
        take,
      }),
    ]);

    return {
      total,
      page: parseInt(page),
      data: messages.map((m) => ({
        id: m.id,
        direction: m.direction,
        type: m.type,
        content: m.content,
        role: m.role,
        timestamp: m.timestamp,
        toolCalls: m.toolCalls,
      })),
    };
  }

  /**
   * POST /conversations/:id/messages
   * Envía un mensaje manual por parte del operador humano (Human Handoff)
   */
  @Post(':id/messages')
  async sendManualMessage(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Body() body: { content: string },
  ) {
    if (!body.content || !body.content.trim()) {
      throw new BadRequestException('El contenido del mensaje es requerido');
    }

    const conv = await this.prisma.conversation.findFirst({
      where: { id, contact: { tenantId } },
      include: { contact: true },
    });
    if (!conv) throw new BadRequestException('Conversación no encontrada');

    const targetContactId = conv.contact.externalId || conv.contact.phone || '';
    if (!targetContactId) {
      throw new BadRequestException('El contacto no tiene un identificador de WhatsApp válido');
    }

    // 1. Guardar interacción en la base de datos
    const interaction = await this.prisma.interaction.create({
      data: {
        conversationId: conv.id,
        direction: 'OUTBOUND',
        type: 'TEXT',
        content: body.content,
        role: 'human', // marcado como operador humano
      },
    });

    // 2. Actualizar estado de la conversación a HANDOFF si aún estaba en ACTIVE
    await this.prisma.conversation.update({
      where: { id: conv.id },
      data: { status: 'HANDOFF' },
    });

    // 3. Despachar a través de WAHA
    try {
      await this.wahaAdapter.sendMessage(tenantId, targetContactId, body.content);
    } catch (err: any) {
      this.logger.error(`Error enviando mensaje manual a WAHA: ${err.message}`);
    }

    return {
      success: true,
      messageId: interaction.id,
      content: interaction.content,
      timestamp: interaction.timestamp,
    };
  }

  /**
   * PATCH /conversations/:id/status
   * Actualiza el estado de la conversación (NEW, ACTIVE, HANDOFF, RESOLVED)
   */
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Body() body: { status: string },
  ) {
    if (!body.status) throw new BadRequestException('status is required');

    const updated = await this.prisma.conversation.updateMany({
      where: { id, contact: { tenantId } },
      data: { status: body.status },
    });

    return { success: true, count: updated.count };
  }
}
