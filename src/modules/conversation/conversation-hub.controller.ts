import { Controller, Get, Post, Patch, Delete, Param, Query, Body, BadRequestException, Logger, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { WahaAdapterService } from '../outbound-engine/services/waha-adapter.service';
import { AdminApiKeyGuard } from '../../shared/guards/admin-api-key.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { TenantId } from '../../shared/decorators/tenant-id.decorator';

@Controller('conversations')
@UseGuards(AdminApiKeyGuard, TenantGuard)
export class ConversationHubController {
  private readonly logger = new Logger(ConversationHubController.name);
  private readonly lastConsolidationByTenant = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly wahaAdapter: WahaAdapterService,
  ) {}

  /**
   * GET /conversations
   * Lista conversaciones del tenant agrupadas por contacto único, con ordenamiento por último mensaje y paginación en SQL.
   */
  @Get()
  async listConversations(
    @TenantId() tenantId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    if (!tenantId) throw new BadRequestException('tenantId is required');

    // 1. Auto-consolidar conversaciones duplicadas con cooldown de 30 min por tenant (sin escanear toda la tabla en cada request)
    await this.consolidateDuplicateConversations(tenantId);

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const take = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * take;

    const where: any = {};
    if (status) where.status = status;

    const hasSearch = Boolean(search && search.trim());

    if (hasSearch) {
      const searchRaw = search!.trim();
      const searchDigits = searchRaw.replace(/\D/g, '');
      const searchWithoutZero = searchDigits.startsWith('0') ? searchDigits.replace(/^0+/, '') : searchDigits;
      const searchWith58 = searchDigits.startsWith('58') ? searchDigits : (searchWithoutZero ? `58${searchWithoutZero}` : '');

      const searchOrClauses: any[] = [
        { contact: { name: { contains: searchRaw, mode: 'insensitive' } } },
        { contact: { phone: { contains: searchRaw, mode: 'insensitive' } } },
        { contact: { phoneNormalized: { contains: searchRaw, mode: 'insensitive' } } },
        { contact: { externalId: { contains: searchRaw, mode: 'insensitive' } } },
        { interactions: { some: { content: { contains: searchRaw, mode: 'insensitive' } } } },
      ];

      if (searchDigits.length >= 3) {
        searchOrClauses.push(
          { contact: { phone: { contains: searchDigits, mode: 'insensitive' } } },
          { contact: { phoneNormalized: { contains: searchDigits, mode: 'insensitive' } } },
          { contact: { externalId: { contains: searchDigits, mode: 'insensitive' } } },
        );
      }

      if (searchWithoutZero && searchWithoutZero.length >= 4) {
        searchOrClauses.push(
          { contact: { phone: { contains: searchWithoutZero, mode: 'insensitive' } } },
          { contact: { phoneNormalized: { contains: searchWithoutZero, mode: 'insensitive' } } },
          { contact: { externalId: { contains: searchWithoutZero, mode: 'insensitive' } } },
        );
      }

      if (searchWith58 && searchWith58.length >= 5) {
        searchOrClauses.push(
          { contact: { phone: { contains: searchWith58, mode: 'insensitive' } } },
          { contact: { phoneNormalized: { contains: searchWith58, mode: 'insensitive' } } },
          { contact: { externalId: { contains: searchWith58, mode: 'insensitive' } } },
        );
      }

      where.AND = [
        { contact: { tenantId } },
        { OR: searchOrClauses },
      ];
    } else {
      where.contact = { tenantId };
    }

    let total = 0;
    let pageIds: string[] = [];

    if (!hasSearch) {
      // Ruta ultra-rápida (99% de las cargas de bandeja): Ordenamiento y paginación directamente en PostgreSQL
      const countPromise = this.prisma.conversation.count({ where });
      const rowsPromise = status
        ? this.prisma.$queryRaw<Array<{ id: string }>>`
            SELECT c.id
            FROM "Conversation" c
            INNER JOIN "Contact" ct ON ct.id = c."contactId"
            WHERE ct."tenantId" = ${tenantId} AND c.status = ${status}
            ORDER BY (
              SELECT MAX(i."timestamp")
              FROM "Interaction" i
              WHERE i."conversationId" = c.id AND i."type" <> 'TOOL_RESULT'
            ) DESC NULLS LAST
            LIMIT ${take} OFFSET ${skip}
          `
        : this.prisma.$queryRaw<Array<{ id: string }>>`
            SELECT c.id
            FROM "Conversation" c
            INNER JOIN "Contact" ct ON ct.id = c."contactId"
            WHERE ct."tenantId" = ${tenantId}
            ORDER BY (
              SELECT MAX(i."timestamp")
              FROM "Interaction" i
              WHERE i."conversationId" = c.id AND i."type" <> 'TOOL_RESULT'
            ) DESC NULLS LAST
            LIMIT ${take} OFFSET ${skip}
          `;

      const [totalCount, idRows] = await Promise.all([countPromise, rowsPromise]);
      total = totalCount;
      pageIds = idRows.map((r) => r.id);
    } else {
      // Ruta con búsqueda de texto: Selección ultraligera solo de IDs y timestamp antes de hidratar los 50 resultados
      const [totalCount, lightweightMatches] = await Promise.all([
        this.prisma.conversation.count({ where }),
        this.prisma.conversation.findMany({
          where,
          select: {
            id: true,
            interactions: {
              where: { type: { notIn: ['TOOL_RESULT'] } },
              orderBy: { timestamp: 'desc' },
              take: 1,
              select: { timestamp: true },
            },
          },
        }),
      ]);

      total = totalCount;
      pageIds = lightweightMatches
        .sort((a, b) => {
          const timeA = a.interactions[0]?.timestamp ? new Date(a.interactions[0].timestamp).getTime() : 0;
          const timeB = b.interactions[0]?.timestamp ? new Date(b.interactions[0].timestamp).getTime() : 0;
          return timeB - timeA;
        })
        .slice(skip, skip + take)
        .map((c) => c.id);
    }

    // Hidratar ÚNICAMENTE las conversaciones de la página actual (máx. 50 en vez de 6,924)
    const hydratedConvs = pageIds.length > 0
      ? await this.prisma.conversation.findMany({
          where: { id: { in: pageIds } },
          include: {
            contact: {
              include: { memory: true },
            },
            interactions: {
              where: { type: { notIn: ['TOOL_RESULT'] } },
              orderBy: { timestamp: 'desc' },
              take: 1,
            },
            _count: { select: { interactions: true } },
          },
        })
      : [];

    // Ordenamiento estricto idéntico a WhatsApp sobre las 50 conversaciones de la página
    const paginatedConvs = hydratedConvs.sort((a, b) => {
      const timeA = a.interactions[0]?.timestamp ? new Date(a.interactions[0].timestamp).getTime() : 0;
      const timeB = b.interactions[0]?.timestamp ? new Date(b.interactions[0].timestamp).getTime() : 0;
      return timeB - timeA;
    });

    const responseData = {
      total,
      page: pageNum,
      limit: take,
      data: paginatedConvs.map((c) => ({
        id: c.id,
        status: c.status,
        contactId: c.contactId,
        contactName: c.contact.name,
        contactPhone: c.contact.phone || c.contact.externalId,
        leadStatus: c.contact.memory?.leadStatus ?? null,
        tags: c.contact.memory?.tags ?? [],
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

  private async consolidateDuplicateConversations(tenantId: string) {
    const now = Date.now();
    const lastRun = this.lastConsolidationByTenant.get(tenantId) || 0;
    // Ejecutar como máximo una vez cada 30 minutos por tenant
    if (now - lastRun < 30 * 60 * 1000) {
      return;
    }
    this.lastConsolidationByTenant.set(tenantId, now);

    try {
      // Buscar en SQL únicamente contactIds que realmente tengan más de 1 conversación (0 filas en operación normal)
      const duplicateGroups = await this.prisma.conversation.groupBy({
        by: ['contactId'],
        where: { contact: { tenantId } },
        _count: { id: true },
        having: {
          id: { _count: { gt: 1 } },
        },
      });

      if (duplicateGroups.length === 0) return;

      const duplicateContactIds = duplicateGroups.map((g) => g.contactId);
      const contactsWithMultipleConvs = await this.prisma.contact.findMany({
        where: { id: { in: duplicateContactIds }, tenantId },
        select: {
          id: true,
          conversations: {
            select: { id: true, status: true },
            orderBy: { id: 'desc' },
          },
        },
      });

      for (const contact of contactsWithMultipleConvs) {
        if (contact.conversations && contact.conversations.length > 1) {
          const masterConv = contact.conversations[0]; // la más reciente
          const duplicateConvs = contact.conversations.slice(1);
          const duplicateIds = duplicateConvs.map((c) => c.id);

          // 1. Mover todas las interacciones a la conversación maestra
          await this.prisma.interaction.updateMany({
            where: { conversationId: { in: duplicateIds } },
            data: { conversationId: masterConv.id },
          });

          // 2. Mover mensajes pendientes o funnels si los hubiera
          await this.prisma.pendingOutboundMessage.updateMany({
            where: { conversationId: { in: duplicateIds } },
            data: { conversationId: masterConv.id },
          });

          // 3. Eliminar conversaciones vacías duplicadas
          await this.prisma.conversation.deleteMany({
            where: { id: { in: duplicateIds } },
          });

          this.logger.log(`[Consolidation] Contacto ${contact.id} consolidó ${duplicateIds.length} conversaciones duplicadas en la conversación maestra ${masterConv.id}`);
        }
      }
    } catch (err: any) {
      this.logger.warn(`[Consolidation] Error consolidando conversaciones: ${err.message}`);
    }
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
      this.prisma.interaction.count({
        where: { conversationId: id, type: { notIn: ['TOOL_RESULT'] } },
      }),
      this.prisma.interaction.findMany({
        where: { conversationId: id, type: { notIn: ['TOOL_RESULT'] } },
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
   * DELETE /conversations/:id/messages/:messageId
   * Elimina un mensaje específico del historial de la conversación.
   */
  @Delete(':id/messages/:messageId')
  async deleteMessage(
    @Param('id') id: string,
    @Param('messageId') messageId: string,
    @TenantId() tenantId: string,
  ) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id, contact: { tenantId } },
    });
    if (!conv) throw new BadRequestException('Conversación no encontrada');

    const interaction = await this.prisma.interaction.findFirst({
      where: { id: messageId, conversationId: id },
    });
    if (!interaction) throw new BadRequestException('Mensaje no encontrado');

    await this.prisma.interaction.delete({
      where: { id: messageId },
    });

    this.logger.log(`[ConversationHub] Mensaje ${messageId} eliminado por el operador en conversación ${id}`);

    return {
      success: true,
      message: 'Mensaje eliminado correctamente del historial',
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

    if (['HANDOFF', 'PAUSED', 'LOST', 'RESOLVED'].includes(body.status.toUpperCase())) {
      await this.prisma.pendingOutboundMessage.deleteMany({
        where: { conversationId: id, status: 'PENDING' },
      });
      this.logger.log(`Cancelados seguimientos pendientes por cambio de estado a "${body.status}" en conversación ${id}`);
    }

    return { success: true, count: updated.count };
  }

  /**
   * DELETE /conversations/:id/history
   * Elimina el historial de mensajes de la conversación y reinicia la memoria del contacto para pruebas limpias.
   */
  @Delete(':id/history')
  async resetHistory(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id, contact: { tenantId } },
      include: { contact: true },
    });

    if (!conv) {
      throw new BadRequestException(`Conversación "${id}" no encontrada.`);
    }

    // 1. Eliminar todas las interacciones de esta conversación
    await this.prisma.interaction.deleteMany({
      where: { conversationId: conv.id },
    });

    // 2. Reiniciar la memoria de negocio, tareas, logs y seguimientos del contacto
    if (conv.contactId) {
      await this.prisma.businessMemory.deleteMany({
        where: { contactId: conv.contactId },
      });
      await this.prisma.memoryAuditLog.deleteMany({
        where: { contactId: conv.contactId },
      });
      await this.prisma.task.deleteMany({
        where: { contactId: conv.contactId },
      });
      await this.prisma.pendingOutboundMessage.deleteMany({
        where: { contactId: conv.contactId },
      });
    }

    // 3. Restablecer el estado de la conversación a 'NEW'
    await this.prisma.conversation.update({
      where: { id: conv.id },
      data: { status: 'NEW' },
    });

    this.logger.log(`🧹 Historial, memoria y seguimientos reiniciados para la conversación ${id} (Contacto: ${conv.contact.name || conv.contact.externalId})`);

    return { success: true, conversationId: conv.id, message: 'Historial y memoria reiniciados correctamente' };
  }

  /**
   * DELETE /conversations/:id/purge-contact
   * Elimina COMPLETAMENTE el contacto del CRM, todas sus conversaciones, memoria, tareas y seguimientos.
   */
  @Delete(':id/purge-contact')
  async purgeContact(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id, contact: { tenantId } },
      include: { contact: true },
    });

    if (!conv) {
      throw new BadRequestException(`Conversación "${id}" no encontrada.`);
    }

    const contactId = conv.contactId;

    if (contactId) {
      const allConvs = await this.prisma.conversation.findMany({ where: { contactId } });
      const convIds = allConvs.map(c => c.id);
      
      if (convIds.length > 0) {
        await this.prisma.interaction.deleteMany({ where: { conversationId: { in: convIds } } });
        await this.prisma.activeFunnel.deleteMany({ where: { conversationId: { in: convIds } } });
        await this.prisma.conversation.deleteMany({ where: { id: { in: convIds } } });
      }

      await this.prisma.task.deleteMany({ where: { contactId } });
      await this.prisma.memoryAuditLog.deleteMany({ where: { contactId } });
      await this.prisma.businessMemory.deleteMany({ where: { contactId } });
      await this.prisma.pendingOutboundMessage.deleteMany({ where: { contactId } });
      await this.prisma.contact.delete({ where: { id: contactId } });
    }

    this.logger.log(`🧨 Contacto ${contactId} (${conv.contact.name || conv.contact.phone}) y toda su data eliminados por completo.`);

    return { success: true, contactId, message: 'Contacto y toda su información eliminados por completo' };
  }
}
