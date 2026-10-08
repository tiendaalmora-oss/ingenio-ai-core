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

export interface SalesFilterQuery {
  date?: string;       // YYYY-MM-DD | 'all' | 'today'
  startDate?: string;  // YYYY-MM-DD
  endDate?: string;    // YYYY-MM-DD
  product?: string;    // Nombre del producto o 'all'
  search?: string;     // Búsqueda por cliente, teléfono o referencia
}

export interface SaleItem {
  id: string; // contactId
  clientName: string;
  phone: string;
  products: string[];
  primaryProduct: string;
  amount: number;
  amountFormatted: string;
  currency: 'BS' | 'USD';
  paymentMethod: string;
  reference: string | null;
  saleTimestamp: string;
  saleDate: string; // YYYY-MM-DD
  conversationId: string | null;
  hasReceipt: boolean;
  receiptSnippet?: string | null;
}

export interface SalesDashboardData {
  filter: {
    mode: 'day' | 'range' | 'all';
    selectedDate: string;
    startDate?: string;
    endDate?: string;
    product?: string;
    search?: string;
  };
  summary: {
    totalSales: number;
    totalRevenueBs: number;
    totalRevenueUsd: number;
    averageTicketBs: number;
    topProduct: string;
    verifiedReceiptsCount: number;
  };
  byProduct: Array<{
    name: string;
    salesCount: number;
    revenueBs: number;
    revenueUsd: number;
    percentage: number;
  }>;
  byPaymentMethod: Array<{
    method: string;
    salesCount: number;
    percentage: number;
  }>;
  sales: SaleItem[];
  availableProducts: string[];
  recentSaleDates: string[];
}

function parseAmount(numStr: string): number {
  if (!numStr) return 0;
  // Clean all characters except digits, dots, and commas
  const clean = numStr.replace(/[^0-9.,]/g, '').trim();
  if (!clean) return 0;

  if (clean.includes('.') && clean.includes(',')) {
    return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
  }
  if (clean.includes('.')) {
    const parts = clean.split('.');
    if (parts[1]?.length === 3) {
      return parseFloat(parts.join('')) || 0;
    }
    return parseFloat(clean) || 0;
  }
  if (clean.includes(',')) {
    return parseFloat(clean.replace(',', '.')) || 0;
  }
  return parseFloat(clean) || 0;
}

function parseReceiptDetails(content: string) {
  let bank = 'Pago Móvil / Transferencia';
  let reference: string | null = null;
  let amount = 7250;
  let currency: 'BS' | 'USD' = 'BS';
  let receiptDate: string | null = null;

  const bankMatch = content.match(/Banco:\s*([^|\n]+)/i);
  if (bankMatch) bank = bankMatch[1].trim();

  const refMatch = content.match(/Referencia:\s*#?([0-9a-zA-Z]+)/i);
  if (refMatch) reference = refMatch[1].trim();

  const amountMatch = content.match(/Monto:\s*([0-9.,]+)\s*([a-zA-Z$]+)?/i);
  if (amountMatch) {
    const parsed = parseAmount(amountMatch[1]);
    if (parsed > 0) amount = parsed;
    if (amountMatch[2]) {
      const cur = amountMatch[2].toUpperCase();
      currency = cur.includes('$') || cur.includes('USD') || cur.includes('USDT') ? 'USD' : 'BS';
    }
  }

  const dateMatch = content.match(/Fecha:\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})/i);
  if (dateMatch) receiptDate = dateMatch[1].trim();

  return { bank, reference, amount, currency, receiptDate };
}

function normalizeText(text: string): string {
  return (text || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function formatDateInTimezone(date: Date, timeZone: string = 'America/Caracas'): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString().split('T')[0];
  }
}

function matchProductFromCatalog(
  interests: string[] | undefined,
  tags: string[] | undefined,
  officialProducts: string[],
): { products: string[]; primaryProduct: string } {
  const candidates = [...(interests || []), ...(tags || [])].filter(Boolean);

  // 1. Si no hay productos oficiales registrados para el tenant, fallback con candidatos o venta general
  if (!officialProducts || officialProducts.length === 0) {
    if (candidates.length > 0) {
      return { products: [candidates[0]], primaryProduct: candidates[0] };
    }
    return { products: ['Venta General'], primaryProduct: 'Venta General' };
  }

  // 2. Si el tenant solo tiene 1 producto oficial (ej. Cejas y Pestañas), asignarlo directamente
  if (officialProducts.length === 1) {
    return { products: [officialProducts[0]], primaryProduct: officialProducts[0] };
  }

  // 3. Búsqueda exacta: si algún interés coincide exactamente con un producto oficial
  for (const cand of candidates) {
    const candNorm = normalizeText(cand);
    for (const official of officialProducts) {
      if (candNorm === normalizeText(official)) {
        return { products: [official], primaryProduct: official };
      }
    }
  }

  // 4. Mapeo semántico / palabras clave principales para materias y categorías
  const subjectKeywords: { [key: string]: string[] } = {
    matematica: ['MATEMATICA', 'CALCULO', 'ALGEBRA', 'GEOMETRIA', 'ARITMETICA'],
    fisica: ['FISICA', 'CINEMATICA', 'DINAMICA', 'ESTATICA', 'ONDAS', 'TERMODINAMICA'],
    quimica: ['QUIMICA', 'TABLA PERIODICA', 'ESTEQUIOMETRIA', 'ENLACE'],
    biologia: ['BIOLOGIA', 'GENETICA', 'CELULA', 'ANATOMIA'],
    ingles: ['INGLES', 'ENGLISH', 'VERBO TO BE'],
    castellano: ['CASTELLANO', 'LITERATURA', 'GRAMATICA', 'LENGUAJE', 'ORTOGRAFIA'],
    preescolar: ['PREESCOLAR', 'INICIAL', 'MATERNAL', 'INFANTIL', 'NOTAS MPPE'],
    biblico: ['BIBLICO', 'BIBLIA', 'CRISTIANO', 'ESCUELA DOMINICAL', 'PASTOR'],
    robotica: ['ROBOTICA', 'COMPUTACION', 'INFORMATICA', 'TECNOLOGIA', 'PROGRAMACION'],
    cejas: ['CEJA', 'PESTANA', 'LASH', 'BROW', 'MICROPIGMENTACION', 'MICROBLADING'],
    tarot: ['TAROT', 'ORACULO', 'TERAPEUTICO', 'CARTAS'],
  };

  for (const cand of candidates) {
    const candNorm = normalizeText(cand);

    for (const [subject, kws] of Object.entries(subjectKeywords)) {
      const matchesCandidate = kws.some((kw) => candNorm.includes(kw));
      if (matchesCandidate) {
        const matchedOfficial = officialProducts.find((p) => {
          const offNorm = normalizeText(p);
          return kws.some((kw) => offNorm.includes(kw)) || offNorm.toLowerCase().includes(subject);
        });
        if (matchedOfficial) {
          return { products: [matchedOfficial], primaryProduct: matchedOfficial };
        }
      }
    }
  }

  // 5. Búsqueda por palabras significativas compartidas (>= 4 caracteres no triviales)
  const stopWords = new Set(['PARA', 'DE', 'DEL', 'LOS', 'LAS', 'CON', 'DOCENTE', 'BACHILLERATO', 'VENEZUELA', 'KIT', 'MEGA', 'PRODUCTO']);
  for (const cand of candidates) {
    const candWords = normalizeText(cand)
      .split(/[\s,.-]+/)
      .filter((w) => w.length >= 4 && !stopWords.has(w));

    for (const official of officialProducts) {
      const offNorm = normalizeText(official);
      const hasMatch = candWords.some((word) => offNorm.includes(word));
      if (hasMatch) {
        return { products: [official], primaryProduct: official };
      }
    }
  }

  // 6. Si ningún producto oficial coincide con certeza
  return {
    products: ['Venta General / Sin Asignar'],
    primaryProduct: 'Venta General / Sin Asignar',
  };
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
        take: 100, // Limitar a los últimos 100 para evitar queries excesivas
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

  /**
   * GET /analytics/sales
   * Tablero comercial detallado de ventas por día y por producto.
   */
  async getSalesDashboard(tenantId: string, query: SalesFilterQuery = {}): Promise<SalesDashboardData> {
    const todayStr = formatDateInTimezone(new Date(), 'America/Caracas');
    let selectedDate = query.date === 'today' ? todayStr : (query.date || todayStr);
    let mode: 'day' | 'range' | 'all' = 'day';

    if (query.date === 'all') {
      mode = 'all';
    } else if (query.startDate && query.endDate) {
      mode = 'range';
    }

    // 1. Cargar productos registrados en el Knowledge Bundle para precios y autocompletado oficial
    const bundle = await this.prisma.knowledgeBundle.findUnique({
      where: { tenantId },
    });
    const rawBundle: any = bundle?.systemPrompt || {};
    const rawData: any = rawBundle['_raw'] || rawBundle;
    const registeredProducts: any[] = rawData['productos'] || [];
    const officialProductNames: string[] = registeredProducts
      .map((p) => (p.nombre || '').trim())
      .filter(Boolean);

    const productPricesMap: Record<string, { price: number; currency: 'BS' | 'USD' }> = {};
    for (const p of registeredProducts) {
      const name = (p.nombre || '').trim();
      const priceStr = p.precio || '';
      const num = parseAmount(priceStr);
      const cur: 'BS' | 'USD' = priceStr.includes('$') || priceStr.toLowerCase().includes('usd') ? 'USD' : 'BS';
      if (name) {
        productPricesMap[name.toLowerCase()] = { price: num || 7250, currency: cur };
      }
    }

    // 2. Obtener contactos que hayan cerrado venta o cuenten con comprobante de pago
    const closedContacts = await this.prisma.contact.findMany({
      where: {
        tenantId,
        memory: {
          OR: [
            { leadStatus: { in: ['CLOSED', 'PAGADO', 'CLIENT', 'SALE', 'closed', 'pagado'] } },
            { tags: { hasSome: ['PAGO_CONFIRMADO', 'COMPROBANTE_RECIBIDO'] } },
          ],
        },
      },
      include: {
        memory: {
          include: {
            auditLogs: {
              where: { field: 'leadStatus' },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
        conversations: {
          select: {
            id: true,
            interactions: {
              where: {
                OR: [
                  { content: { contains: 'Comprobante de Pago Detectado' } },
                  { content: { contains: '📸' } },
                  { type: 'IMAGE' },
                ],
              },
              orderBy: { timestamp: 'desc' },
              take: 3,
            },
          },
          orderBy: { id: 'desc' },
        },
      },
      orderBy: { id: 'desc' },
    });

    const allSales: SaleItem[] = [];
    const allProductsSet = new Set<string>(officialProductNames);

    for (const c of closedContacts) {
      // a. Inferir producto comparando estrictamente con el catálogo de Business Studio
      const { products, primaryProduct } = matchProductFromCatalog(
        c.memory?.interests,
        c.memory?.tags,
        officialProductNames,
      );
      if (primaryProduct !== 'Venta General / Sin Asignar') {
        allProductsSet.add(primaryProduct);
      }

      // b. Buscar comprobante de pago o recibo en las interacciones
      let detectedReceipt: {
        bank: string;
        reference: string | null;
        amount: number;
        currency: 'BS' | 'USD';
        receiptDate: string | null;
      } | null = null;
      let receiptInteraction: any = null;
      let matchedConvId: string | null = null;

      for (const conv of c.conversations) {
        for (const inter of conv.interactions) {
          if (inter.content?.includes('Comprobante de Pago Detectado')) {
            detectedReceipt = parseReceiptDetails(inter.content);
            receiptInteraction = inter;
            matchedConvId = conv.id;
            break;
          }
        }
        if (detectedReceipt) break;
      }

      // Si no hubo interacción explícita de "Comprobante de Pago Detectado", verificar imágenes
      if (!detectedReceipt && c.conversations.length > 0) {
        matchedConvId = c.conversations[0].id;
      }

      // c. Determinar timestamp y fecha de la venta en zona horaria local (America/Caracas UTC-4)
      let saleTimestampDate: Date;
      if (receiptInteraction?.timestamp) {
        saleTimestampDate = new Date(receiptInteraction.timestamp);
      } else if (c.memory?.auditLogs && c.memory.auditLogs.length > 0 && c.memory.auditLogs[0].createdAt) {
        saleTimestampDate = new Date(c.memory.auditLogs[0].createdAt);
      } else if (c.memory?.lastInteraction) {
        saleTimestampDate = new Date(c.memory.lastInteraction);
      } else if (c.memory?.updatedAt) {
        saleTimestampDate = new Date(c.memory.updatedAt);
      } else {
        saleTimestampDate = new Date();
      }

      const saleTimestamp = saleTimestampDate.toISOString();
      const saleDate = formatDateInTimezone(saleTimestampDate, 'America/Caracas');

      // d. Determinar monto y moneda
      let amount = detectedReceipt?.amount || 0;
      let currency: 'BS' | 'USD' = detectedReceipt?.currency || 'BS';

      if (!amount || amount === 0) {
        // Buscar en catálogo de productos
        const matchedCatalog = productPricesMap[primaryProduct.toLowerCase()];
        if (matchedCatalog && matchedCatalog.price > 0) {
          amount = matchedCatalog.price;
          currency = matchedCatalog.currency;
        } else {
          // Valor estándar por defecto
          amount = 7250;
          currency = 'BS';
        }
      }

      const amountFormatted = currency === 'USD' 
        ? `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : `${amount.toLocaleString('es-VE')} Bs`;

      allSales.push({
        id: c.id,
        clientName: c.name || 'Cliente sin nombre',
        phone: c.phone || c.externalId || 'S/N',
        products,
        primaryProduct,
        amount,
        amountFormatted,
        currency,
        paymentMethod: detectedReceipt?.bank || 'Pago Móvil / Transferencia',
        reference: detectedReceipt?.reference || null,
        saleTimestamp,
        saleDate,
        conversationId: matchedConvId,
        hasReceipt: Boolean(detectedReceipt),
        receiptSnippet: receiptInteraction?.content || null,
      });
    }

    // Identificar fechas recientes con ventas (para botones rápidos de acceso)
    const recentSaleDates = Array.from(new Set(allSales.map(s => s.saleDate)))
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 10);

    // 3. Aplicar Filtros (Fecha, Producto, Búsqueda)
    let filteredSales = allSales;

    // Filtro de Fecha
    if (mode === 'day') {
      filteredSales = filteredSales.filter(s => s.saleDate === selectedDate);
    } else if (mode === 'range' && query.startDate && query.endDate) {
      filteredSales = filteredSales.filter(s => s.saleDate >= query.startDate! && s.saleDate <= query.endDate!);
    }

    // Filtro de Producto
    if (query.product && query.product !== 'all') {
      const prodFilter = query.product.toLowerCase().trim();
      filteredSales = filteredSales.filter(s => 
        s.primaryProduct.toLowerCase().includes(prodFilter) ||
        s.products.some(p => p.toLowerCase().includes(prodFilter))
      );
    }

    // Filtro de Búsqueda
    if (query.search && query.search.trim()) {
      const q = query.search.toLowerCase().trim();
      filteredSales = filteredSales.filter(s =>
        s.clientName.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q) ||
        (s.reference && s.reference.toLowerCase().includes(q))
      );
    }

    // Ordenar ventas filtradas por fecha/hora descendente
    filteredSales.sort((a, b) => new Date(b.saleTimestamp).getTime() - new Date(a.saleTimestamp).getTime());

    // 4. Calcular KPIs y agregaciones
    let totalRevenueBs = 0;
    let totalRevenueUsd = 0;
    let bsSalesCount = 0;
    let verifiedReceiptsCount = 0;

    const productStatsMap: Record<string, { count: number; bs: number; usd: number }> = {};
    const methodStatsMap: Record<string, number> = {};

    for (const sale of filteredSales) {
      if (sale.currency === 'USD') {
        totalRevenueUsd += sale.amount;
      } else {
        totalRevenueBs += sale.amount;
        bsSalesCount++;
      }

      if (sale.hasReceipt) verifiedReceiptsCount++;

      // Por producto
      const pName = sale.primaryProduct;
      if (!productStatsMap[pName]) {
        productStatsMap[pName] = { count: 0, bs: 0, usd: 0 };
      }
      productStatsMap[pName].count++;
      if (sale.currency === 'USD') productStatsMap[pName].usd += sale.amount;
      else productStatsMap[pName].bs += sale.amount;

      // Por método de pago
      const method = sale.paymentMethod;
      methodStatsMap[method] = (methodStatsMap[method] || 0) + 1;
    }

    const totalSales = filteredSales.length;
    const averageTicketBs = bsSalesCount > 0 ? Math.round(totalRevenueBs / bsSalesCount) : 0;

    // Desglose por producto con porcentajes
    const byProduct = Object.entries(productStatsMap)
      .map(([name, stats]) => ({
        name,
        salesCount: stats.count,
        revenueBs: stats.bs,
        revenueUsd: stats.usd,
        percentage: totalSales > 0 ? Number(((stats.count / totalSales) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.salesCount - a.salesCount);

    const topProduct = byProduct[0]?.name || 'N/A';

    // Desglose por método de pago con porcentajes
    const byPaymentMethod = Object.entries(methodStatsMap)
      .map(([method, count]) => ({
        method,
        salesCount: count,
        percentage: totalSales > 0 ? Number(((count / totalSales) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.salesCount - a.salesCount);

    return {
      filter: {
        mode,
        selectedDate,
        startDate: query.startDate,
        endDate: query.endDate,
        product: query.product,
        search: query.search,
      },
      summary: {
        totalSales,
        totalRevenueBs,
        totalRevenueUsd,
        averageTicketBs,
        topProduct,
        verifiedReceiptsCount,
      },
      byProduct,
      byPaymentMethod,
      sales: filteredSales,
      availableProducts: Array.from(allProductsSet).sort(),
      recentSaleDates,
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
