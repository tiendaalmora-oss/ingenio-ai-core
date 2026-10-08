import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CreateCampaignDto, EstimateAudienceDto, TargetFiltersDto } from './dto/create-campaign.dto';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Construye la condición WHERE para filtrar contactos según los filtros de audiencia.
   */
  private buildAudienceWhere(tenantId: string, filters: TargetFiltersDto = {}): any {
    const memoryWhere: any = {};
    const conditions: any[] = [];

    // 1. Filtro por Estado Comercial
    if (filters.leadStatus && filters.leadStatus !== 'ALL') {
      const statusUpper = filters.leadStatus.toUpperCase();
      if (statusUpper === 'CLOSED' || statusUpper === 'PAGADO') {
        conditions.push({
          OR: [
            { leadStatus: { in: ['CLOSED', 'PAGADO', 'CLIENT', 'closed', 'pagado'] } },
            { tags: { hasSome: ['PAGO_CONFIRMADO', 'COMPROBANTE_RECIBIDO'] } },
          ],
        });
      } else if (statusUpper === 'WARM' || statusUpper === 'INTERESADO') {
        conditions.push({
          leadStatus: { in: ['WARM', 'warm'] },
        });
      } else if (statusUpper === 'HOT') {
        conditions.push({
          leadStatus: { in: ['HOT', 'hot'] },
        });
      } else if (statusUpper === 'COLD') {
        conditions.push({
          leadStatus: { in: ['COLD', 'cold', 'NEW', 'new'] },
        });
      }
    }

    // 2. Filtro por Producto Adquirido o Interés
    if (filters.product && filters.product !== 'ALL') {
      const prodTerm = filters.product.trim();
      conditions.push({
        interests: { hasSome: [prodTerm] },
      });
    }

    // 3. Filtro por Etiquetas (Tags)
    if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
      conditions.push({
        tags: { hasSome: filters.tags },
      });
    }

    const where: any = { tenantId };
    if (conditions.length > 0) {
      where.memory = { AND: conditions };
    }

    return where;
  }

  /**
   * Renderiza el mensaje sustituyendo variables dinámicas del contacto.
   */
  renderMessage(template: string, contact: { name?: string | null; phone?: string | null; interests?: string[] }): string {
    let text = template || '';
    const cleanName = (contact.name || 'Amigo/a').trim();
    const cleanPhone = (contact.phone || '').trim();
    const primaryProduct = contact.interests?.[0] || 'tu producto';

    text = text.replace(/\{\{\s*nombre\s*\}\}/gi, cleanName);
    text = text.replace(/\{\{\s*name\s*\}\}/gi, cleanName);
    text = text.replace(/\{\{\s*producto\s*\}\}/gi, primaryProduct);
    text = text.replace(/\{\{\s*product\s*\}\}/gi, primaryProduct);
    text = text.replace(/\{\{\s*telefono\s*\}\}/gi, cleanPhone);
    text = text.replace(/\{\{\s*phone\s*\}\}/gi, cleanPhone);

    return text;
  }

  /**
   * Estima la cantidad de contactos que coinciden con los filtros en tiempo real.
   */
  async estimateAudience(tenantId: string, filters: EstimateAudienceDto = {}) {
    const where = this.buildAudienceWhere(tenantId, filters);

    const [totalCount, sampleContacts] = await Promise.all([
      this.prisma.contact.count({ where }),
      this.prisma.contact.findMany({
        where,
        take: 10,
        select: {
          id: true,
          name: true,
          phone: true,
          memory: {
            select: {
              leadStatus: true,
              interests: true,
              tags: true,
            },
          },
        },
        orderBy: { id: 'desc' },
      }),
    ]);

    return {
      totalCount,
      sampleContacts: sampleContacts.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone || 'S/N',
        leadStatus: c.memory?.leadStatus || 'COLD',
        interests: c.memory?.interests || [],
        tags: c.memory?.tags || [],
      })),
    };
  }

  /**
   * Obtiene la lista de etiquetas y productos disponibles para crear filtros.
   */
  async getAvailableFilterOptions(tenantId: string) {
    const [bundle, contacts] = await Promise.all([
      this.prisma.knowledgeBundle.findUnique({ where: { tenantId } }),
      this.prisma.contact.findMany({
        where: { tenantId },
        select: {
          memory: {
            select: {
              tags: true,
              interests: true,
            },
          },
        },
      }),
    ]);

    const rawBundle: any = bundle?.systemPrompt || {};
    const rawData: any = rawBundle['_raw'] || rawBundle;
    const registeredProducts: any[] = rawData['productos'] || [];

    const productsSet = new Set<string>();
    registeredProducts.forEach((p) => {
      if (p.nombre) productsSet.add(p.nombre.trim());
    });

    const tagsSet = new Set<string>();
    contacts.forEach((c) => {
      (c.memory?.tags || []).forEach((t) => tagsSet.add(t));
      (c.memory?.interests || []).forEach((i) => productsSet.add(i));
    });

    return {
      products: Array.from(productsSet).sort(),
      tags: Array.from(tagsSet).sort(),
    };
  }

  /**
   * Crea una campaña y encola todos los contactos coincidentes.
   */
  async createCampaign(tenantId: string, dto: CreateCampaignDto) {
    if (!dto.name || !dto.name.trim()) {
      throw new BadRequestException('El nombre de la campaña es obligatorio');
    }
    if (!dto.messageTemplate || !dto.messageTemplate.trim()) {
      throw new BadRequestException('El mensaje de la campaña es obligatorio');
    }

    const where = this.buildAudienceWhere(tenantId, dto.targetFilters);

    // Obtener todos los contactos destinatarios
    const matchingContacts = await this.prisma.contact.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        externalId: true,
        memory: {
          select: {
            interests: true,
            tags: true,
          },
        },
      },
    });

    if (matchingContacts.length === 0) {
      throw new BadRequestException('No se encontraron contactos que coincidan con los filtros seleccionados');
    }

    const channel = dto.channel || 'WHATSAPP';
    const status = dto.autoStart !== false ? 'RUNNING' : 'DRAFT';
    const dripIntervalSeconds = Math.max(15, dto.dripIntervalSeconds || 30);

    // Crear registro de la campaña
    const campaign = await this.prisma.campaign.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        channel,
        status,
        targetFilters: (dto.targetFilters as any) || {},
        totalRecipients: matchingContacts.length,
        sentCount: 0,
        failedCount: 0,
        messageTemplate: dto.messageTemplate,
        mediaUrl: dto.mediaUrl || null,
        mediaType: dto.mediaType || (dto.mediaUrl ? 'IMAGE' : null),
        mediaFilename: dto.mediaFilename || null,
        subject: dto.subject || null,
        dripIntervalSeconds,
        botResponseMode: 'AI_CONTEXT',
      },
    });

    // Encolar los elementos individuales de la campaña
    const itemsData = matchingContacts.map((contact) => {
      const rendered = this.renderMessage(dto.messageTemplate, {
        name: contact.name,
        phone: contact.phone || contact.externalId,
        interests: contact.memory?.interests,
      });

      return {
        campaignId: campaign.id,
        contactId: contact.id,
        recipientPhone: contact.phone || contact.externalId || null,
        recipientName: contact.name || null,
        renderedMessage: rendered,
        status: 'PENDING',
      };
    });

    await this.prisma.campaignItem.createMany({
      data: itemsData,
    });

    this.logger.log(
      `[Campaigns] Campaña "${campaign.name}" creada con éxito (ID: ${campaign.id}). Encolados ${itemsData.length} destinatarios. Estado: ${status}`
    );

    return {
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        channel: campaign.channel,
        status: campaign.status,
        totalRecipients: campaign.totalRecipients,
        dripIntervalSeconds: campaign.dripIntervalSeconds,
      },
    };
  }

  /**
   * Lista todas las campañas de un tenant con estadísticas resumidas.
   */
  async listCampaigns(tenantId: string) {
    const campaigns = await this.prisma.campaign.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            items: true,
          },
        },
      },
    });

    return campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      channel: c.channel,
      status: c.status,
      totalRecipients: c.totalRecipients,
      sentCount: c.sentCount,
      failedCount: c.failedCount,
      dripIntervalSeconds: c.dripIntervalSeconds,
      mediaUrl: c.mediaUrl,
      mediaType: c.mediaType,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      progressPercentage:
        c.totalRecipients > 0 ? Number(((c.sentCount / c.totalRecipients) * 100).toFixed(1)) : 0,
    }));
  }

  /**
   * Obtiene el detalle completo de una campaña específica y sus últimos ítems procesados.
   */
  async getCampaignDetails(tenantId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, tenantId },
      include: {
        items: {
          take: 50,
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            recipientName: true,
            recipientPhone: true,
            status: true,
            errorMessage: true,
            sentAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaña no encontrada');
    }

    return {
      ...campaign,
      progressPercentage:
        campaign.totalRecipients > 0
          ? Number(((campaign.sentCount / campaign.totalRecipients) * 100).toFixed(1))
          : 0,
    };
  }

  /**
   * Pausa una campaña activa.
   */
  async pauseCampaign(tenantId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, tenantId },
    });
    if (!campaign) throw new NotFoundException('Campaña no encontrada');

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'PAUSED' },
    });

    return { success: true, message: 'Campaña pausada exitosamente', status: 'PAUSED' };
  }

  /**
   * Reanuda una campaña pausada.
   */
  async resumeCampaign(tenantId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, tenantId },
    });
    if (!campaign) throw new NotFoundException('Campaña no encontrada');

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'RUNNING' },
    });

    return { success: true, message: 'Campaña reanudada exitosamente', status: 'RUNNING' };
  }

  /**
   * Cancela una campaña y detiene cualquier envío pendiente.
   */
  async cancelCampaign(tenantId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, tenantId },
    });
    if (!campaign) throw new NotFoundException('Campaña no encontrada');

    await this.prisma.$transaction([
      this.prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'CANCELLED' },
      }),
      this.prisma.campaignItem.updateMany({
        where: { campaignId, status: 'PENDING' },
        data: { status: 'FAILED', errorMessage: 'Campaña cancelada por el usuario' },
      }),
    ]);

    return { success: true, message: 'Campaña cancelada exitosamente', status: 'CANCELLED' };
  }
}
