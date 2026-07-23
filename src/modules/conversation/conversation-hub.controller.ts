import { Controller, Get, Param, Query, Headers, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';

@Controller('conversations')
export class ConversationHubController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /conversations
   * Lista conversaciones con paginación, búsqueda y filtro de estado.
   */
  @Get()
  async listConversations(
    @Headers('x-tenant-id') tenantId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    if (!tenantId) throw new BadRequestException('x-tenant-id header is required');
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
        contactPhone: c.contact.phone,
        leadStatus: c.contact.memory?.leadStatus ?? null,
        messageCount: c._count.interactions,
        lastMessage: c.interactions[0]
          ? {
              content: c.interactions[0].content,
              direction: c.interactions[0].direction,
              timestamp: c.interactions[0].timestamp,
            }
          : null,
      })),
    };

    console.log('Resultado que se devolverá:', responseData.data);
    console.log('Total que se devolverá:', total);

    return responseData;
  }

  /**
   * GET /conversations/:id
   * Detalle de una conversación con datos del lead.
   */
  @Get(':id')
  async getConversation(@Param('id') id: string) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        contact: { include: { memory: true } },
        activeFunnel: true,
        _count: { select: { interactions: true } },
      },
    });
    if (!conv) return { error: 'Not found' };
    return {
      id: conv.id,
      status: conv.status,
      contact: {
        id: conv.contact.id,
        name: conv.contact.name,
        phone: conv.contact.phone,
        leadStatus: conv.contact.memory?.leadStatus,
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
   * Historial completo de mensajes de una conversación.
   */
  @Get(':id/messages')
  async getMessages(
    @Param('id') id: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
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
      })),
    };
  }
}
