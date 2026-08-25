import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';

export interface AnalyticsSummary {
  funnel: {
    totalLeads: number;
    cold: number;
    warm: number;
    hot: number;
    closed: number;
    handoff: number;
    conversionRate: number; // Porcentaje de cierre
  };
  products: Array<{
    name: string;
    price: string;
    totalInquiries: number;
    warm: number;
    hot: number;
    closed: number;
    conversionRate: number;
    estimatedRevenue: number;
  }>;
  followUps: {
    totalSent: number;
    pending: number;
    respondedCount: number;
    reactivationRate: number; // Porcentaje de prospectos que respondieron
  };
  topTags: Array<{ tag: string; count: number }>;
  topObjections: Array<{ objection: string; count: number }>;
  dailyVolume: Array<{ date: string; inbound: number; outbound: number }>;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSummary(tenantId: string): Promise<AnalyticsSummary> {
    // 1. Obtener todos los contactos del tenant con sus memorias y conversaciones
    const contacts = await this.prisma.contact.findMany({
      where: { tenantId },
      include: {
        memory: true,
        conversations: {
          include: {
            interactions: {
              orderBy: { timestamp: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    const totalLeads = contacts.length;
    let cold = 0;
    let warm = 0;
    let hot = 0;
    let closed = 0;
    let handoff = 0;

    const tagsMap: Record<string, number> = {};
    const objectionsMap: Record<string, number> = {};
    const productInterestMap: Record<string, { total: number; warm: number; hot: number; closed: number }> = {};

    for (const c of contacts) {
      const status = (c.memory?.leadStatus || 'COLD').toUpperCase();
      if (status === 'CLOSED' || status === 'PAGADO') closed++;
      else if (status === 'HOT') hot++;
      else if (status === 'WARM') warm++;
      else cold++;

      // Verificar si alguna conversación está en HANDOFF
      const isHandoff = c.conversations.some(conv => conv.status === 'HANDOFF');
      if (isHandoff) handoff++;

      // Tags
      if (c.memory?.tags && Array.isArray(c.memory.tags)) {
        for (const tag of c.memory.tags) {
          tagsMap[tag] = (tagsMap[tag] || 0) + 1;
        }
      }

      // Objeciones
      if (c.memory?.objections && Array.isArray(c.memory.objections)) {
        for (const obj of c.memory.objections) {
          objectionsMap[obj] = (objectionsMap[obj] || 0) + 1;
        }
      }

      // Intereses / Productos
      if (c.memory?.interests && Array.isArray(c.memory.interests)) {
        for (const prod of c.memory.interests) {
          if (!productInterestMap[prod]) {
            productInterestMap[prod] = { total: 0, warm: 0, hot: 0, closed: 0 };
          }
          productInterestMap[prod].total++;
          if (status === 'CLOSED' || status === 'PAGADO') productInterestMap[prod].closed++;
          else if (status === 'HOT') productInterestMap[prod].hot++;
          else if (status === 'WARM') productInterestMap[prod].warm++;
        }
      }
    }

    const conversionRate = totalLeads > 0 ? Number(((closed / totalLeads) * 100).toFixed(1)) : 0;

    // 2. Cargar productos registrados en el Knowledge Bundle del Tenant
    const bundle = await this.prisma.knowledgeBundle.findUnique({
      where: { tenantId },
    });
    const rawBundle: any = bundle?.systemPrompt || {};
    const rawData: any = rawBundle['_raw'] || rawBundle;
    const registeredProducts: any[] = rawData['productos'] || [];

    const productsList: AnalyticsSummary['products'] = [];

    // Combinar productos registrados con los datos de interés
    if (registeredProducts.length > 0) {
      for (const p of registeredProducts) {
        const name = p.nombre || 'Producto';
        const priceStr = p.precio || '0';
        const stats = productInterestMap[name] || { total: 0, warm: 0, hot: 0, closed: 0 };
        
        // Extraer valor numérico del precio
        const numericPrice = parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
        const estimatedRevenue = stats.closed * numericPrice;
        const prodRate = stats.total > 0 ? Number(((stats.closed / stats.total) * 100).toFixed(1)) : 0;

        productsList.push({
          name,
          price: priceStr,
          totalInquiries: stats.total,
          warm: stats.warm,
          hot: stats.hot,
          closed: stats.closed,
          conversionRate: prodRate,
          estimatedRevenue,
        });
      }
    } else {
      // Fallback si no hay productos registrados explícitos pero hay intereses
      for (const [name, stats] of Object.entries(productInterestMap)) {
        productsList.push({
          name,
          price: 'N/A',
          totalInquiries: stats.total,
          warm: stats.warm,
          hot: stats.hot,
          closed: stats.closed,
          conversionRate: stats.total > 0 ? Number(((stats.closed / stats.total) * 100).toFixed(1)) : 0,
          estimatedRevenue: 0,
        });
      }
    }

    // 3. Métricas de Seguimiento (PendingOutboundMessage)
    const [totalSentFollowUps, pendingFollowUps, sentMessages] = await Promise.all([
      this.prisma.pendingOutboundMessage.count({
        where: { tenantId, status: 'SENT' },
      }),
      this.prisma.pendingOutboundMessage.count({
        where: { tenantId, status: 'PENDING' },
      }),
      this.prisma.pendingOutboundMessage.findMany({
        where: { tenantId, status: 'SENT', sentAt: { not: null } },
        select: { conversationId: true, sentAt: true },
      }),
    ]);

    // Calcular cuántos respondieron después de un seguimiento
    let respondedCount = 0;
    for (const sm of sentMessages) {
      if (!sm.sentAt) continue;
      const replied = await this.prisma.interaction.findFirst({
        where: {
          conversationId: sm.conversationId,
          direction: 'INBOUND',
          timestamp: { gt: sm.sentAt },
        },
      });
      if (replied) respondedCount++;
    }

    const reactivationRate = totalSentFollowUps > 0 
      ? Number(((respondedCount / totalSentFollowUps) * 100).toFixed(1)) 
      : 0;

    // 4. Top Tags & Objections ordenados
    const topTags = Object.entries(tagsMap)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topObjections = Object.entries(objectionsMap)
      .map(([objection, count]) => ({ objection, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 5. Volumen Diario de los últimos 7 días
    const dailyVolume = await this.getDailyVolume(tenantId);

    return {
      funnel: {
        totalLeads,
        cold,
        warm,
        hot,
        closed,
        handoff,
        conversionRate,
      },
      products: productsList,
      followUps: {
        totalSent: totalSentFollowUps,
        pending: pendingFollowUps,
        respondedCount,
        reactivationRate,
      },
      topTags,
      topObjections,
      dailyVolume,
    };
  }

  private async getDailyVolume(tenantId: string): Promise<Array<{ date: string; inbound: number; outbound: number }>> {
    const days = 7;
    const result: Array<{ date: string; inbound: number; outbound: number }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - i);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setHours(23, 59, 59, 999);

      const dateLabel = start.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });

      const [inbound, outbound] = await Promise.all([
        this.prisma.interaction.count({
          where: {
            conversation: { contact: { tenantId } },
            direction: 'INBOUND',
            timestamp: { gte: start, lte: end },
          },
        }),
        this.prisma.interaction.count({
          where: {
            conversation: { contact: { tenantId } },
            direction: 'OUTBOUND',
            timestamp: { gte: start, lte: end },
          },
        }),
      ]);

      result.push({ date: dateLabel, inbound, outbound });
    }

    return result;
  }
}
