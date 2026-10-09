"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AnalyticsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
function parseAmount(numStr) {
    if (!numStr)
        return 0;
    const clean = numStr.replace(/[^0-9.,]/g, '').trim();
    if (!clean)
        return 0;
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
function parseReceiptDetails(content) {
    let bank = 'Pago Móvil / Transferencia';
    let reference = null;
    let amount = 0;
    let currency = 'BS';
    let receiptDate = null;
    const upperContent = (content || '').toUpperCase();
    if (upperContent.includes('ZELLE') ||
        upperContent.includes('ZINLI') ||
        upperContent.includes('BINANCE') ||
        upperContent.includes('PAYPAL') ||
        upperContent.includes('USDT') ||
        upperContent.includes('USD') ||
        (content || '').includes('$')) {
        currency = 'USD';
    }
    const bankMatch = content.match(/(?:Banco\/Plataforma|Banco|Plataforma):\s*([^|\n]+)/i);
    if (bankMatch)
        bank = bankMatch[1].trim();
    const refMatch = content.match(/(?:Referencia|Ref|TxID|Hash|ID Transacci[oó]n|Comprobante):\s*#?([0-9a-zA-Z]+)/i);
    if (refMatch)
        reference = refMatch[1].trim();
    const amountMatch = content.match(/Monto:\s*([0-9.,]+)\s*([a-zA-Z$]+)?/i);
    if (amountMatch) {
        const parsed = parseAmount(amountMatch[1]);
        if (parsed > 0)
            amount = parsed;
        if (amountMatch[2]) {
            const cur = amountMatch[2].toUpperCase();
            currency = cur.includes('$') || cur.includes('USD') || cur.includes('USDT') ? 'USD' : 'BS';
        }
    }
    const dateMatch = content.match(/Fecha:\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})/i);
    if (dateMatch)
        receiptDate = dateMatch[1].trim();
    return { bank, reference, amount, currency, receiptDate };
}
function normalizeText(text) {
    return (text || '')
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}
function formatDateInTimezone(date, timeZone = 'America/Caracas') {
    try {
        return new Intl.DateTimeFormat('en-CA', {
            timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(date);
    }
    catch {
        return date.toISOString().split('T')[0];
    }
}
function matchProductFromCatalog(interests, tags, officialProducts) {
    const candidates = [...(interests || []), ...(tags || [])].filter(Boolean);
    if (!officialProducts || officialProducts.length === 0) {
        if (candidates.length > 0) {
            return { products: [candidates[0]], primaryProduct: candidates[0] };
        }
        return { products: ['Venta General'], primaryProduct: 'Venta General' };
    }
    if (officialProducts.length === 1) {
        return { products: [officialProducts[0]], primaryProduct: officialProducts[0] };
    }
    for (const cand of candidates) {
        const candNorm = normalizeText(cand);
        for (const official of officialProducts) {
            if (candNorm === normalizeText(official)) {
                return { products: [official], primaryProduct: official };
            }
        }
    }
    const subjectKeywords = {
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
    return {
        products: ['Venta General / Sin Asignar'],
        primaryProduct: 'Venta General / Sin Asignar',
    };
}
let AnalyticsService = AnalyticsService_1 = class AnalyticsService {
    prisma;
    logger = new common_1.Logger(AnalyticsService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getSummary(tenantId) {
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
        const tagsMap = {};
        const objectionsMap = {};
        const productInterestMap = {};
        for (const c of contacts) {
            const status = (c.memory?.leadStatus || 'COLD').toUpperCase();
            if (status === 'CLOSED' || status === 'PAGADO')
                closed++;
            else if (status === 'HOT')
                hot++;
            else if (status === 'WARM')
                warm++;
            else
                cold++;
            const isHandoff = c.conversations.some(conv => conv.status === 'HANDOFF');
            if (isHandoff)
                handoff++;
            if (c.memory?.tags && Array.isArray(c.memory.tags)) {
                for (const tag of c.memory.tags) {
                    tagsMap[tag] = (tagsMap[tag] || 0) + 1;
                }
            }
            if (c.memory?.objections && Array.isArray(c.memory.objections)) {
                for (const obj of c.memory.objections) {
                    objectionsMap[obj] = (objectionsMap[obj] || 0) + 1;
                }
            }
            if (c.memory?.interests && Array.isArray(c.memory.interests)) {
                for (const prod of c.memory.interests) {
                    if (!productInterestMap[prod]) {
                        productInterestMap[prod] = { total: 0, warm: 0, hot: 0, closed: 0 };
                    }
                    productInterestMap[prod].total++;
                    if (status === 'CLOSED' || status === 'PAGADO')
                        productInterestMap[prod].closed++;
                    else if (status === 'HOT')
                        productInterestMap[prod].hot++;
                    else if (status === 'WARM')
                        productInterestMap[prod].warm++;
                }
            }
        }
        const conversionRate = totalLeads > 0 ? Number(((closed / totalLeads) * 100).toFixed(1)) : 0;
        const bundle = await this.prisma.knowledgeBundle.findUnique({
            where: { tenantId },
        });
        const rawBundle = bundle?.systemPrompt || {};
        const rawData = rawBundle['_raw'] || rawBundle;
        const registeredProducts = rawData['productos'] || [];
        const productsList = [];
        if (registeredProducts.length > 0) {
            for (const p of registeredProducts) {
                const name = p.nombre || 'Producto';
                const priceStr = p.precio || '0';
                const stats = productInterestMap[name] || { total: 0, warm: 0, hot: 0, closed: 0 };
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
        }
        else {
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
                take: 100,
            }),
        ]);
        let respondedCount = 0;
        for (const sm of sentMessages) {
            if (!sm.sentAt)
                continue;
            const replied = await this.prisma.interaction.findFirst({
                where: {
                    conversationId: sm.conversationId,
                    direction: 'INBOUND',
                    timestamp: { gt: sm.sentAt },
                },
            });
            if (replied)
                respondedCount++;
        }
        const reactivationRate = totalSentFollowUps > 0
            ? Number(((respondedCount / totalSentFollowUps) * 100).toFixed(1))
            : 0;
        const topTags = Object.entries(tagsMap)
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        const topObjections = Object.entries(objectionsMap)
            .map(([objection, count]) => ({ objection, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
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
    async getSalesDashboard(tenantId, query = {}) {
        const todayStr = formatDateInTimezone(new Date(), 'America/Caracas');
        let selectedDate = query.date === 'today' ? todayStr : (query.date || todayStr);
        let mode = 'day';
        if (query.date === 'all') {
            mode = 'all';
        }
        else if (query.startDate && query.endDate) {
            mode = 'range';
        }
        const bundle = await this.prisma.knowledgeBundle.findUnique({
            where: { tenantId },
        });
        const rawBundle = bundle?.systemPrompt || {};
        const rawData = rawBundle['_raw'] || rawBundle;
        const registeredProducts = rawData['productos'] || [];
        const officialProductNames = registeredProducts
            .map((p) => (p.nombre || '').trim())
            .filter(Boolean);
        let defaultTenantPrice = 0;
        let defaultTenantCurrency = 'BS';
        const productPricesMap = {};
        for (const p of registeredProducts) {
            const name = (p.nombre || '').trim();
            const priceStr = (p.precio || '').toString();
            const num = parseAmount(priceStr);
            const isUsd = priceStr.includes('$') ||
                priceStr.toLowerCase().includes('usd') ||
                priceStr.toLowerCase().includes('usdt');
            const cur = isUsd ? 'USD' : 'BS';
            if (num > 0 && defaultTenantPrice === 0) {
                defaultTenantPrice = num;
                defaultTenantCurrency = cur;
            }
            if (name) {
                productPricesMap[name.toLowerCase()] = { price: num, currency: cur };
            }
        }
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
        const allSales = [];
        const allProductsSet = new Set(officialProductNames);
        for (const c of closedContacts) {
            const { products, primaryProduct } = matchProductFromCatalog(c.memory?.interests, c.memory?.tags, officialProductNames);
            if (primaryProduct !== 'Venta General / Sin Asignar') {
                allProductsSet.add(primaryProduct);
            }
            let detectedReceipt = null;
            let receiptInteraction = null;
            let matchedConvId = null;
            for (const conv of c.conversations) {
                for (const inter of conv.interactions) {
                    if (inter.content?.includes('Comprobante de Pago Detectado')) {
                        detectedReceipt = parseReceiptDetails(inter.content);
                        receiptInteraction = inter;
                        matchedConvId = conv.id;
                        break;
                    }
                }
                if (detectedReceipt)
                    break;
            }
            if (!detectedReceipt && c.conversations.length > 0) {
                matchedConvId = c.conversations[0].id;
            }
            let saleTimestampDate;
            if (receiptInteraction?.timestamp) {
                saleTimestampDate = new Date(receiptInteraction.timestamp);
            }
            else if (c.memory?.auditLogs && c.memory.auditLogs.length > 0 && c.memory.auditLogs[0].createdAt) {
                saleTimestampDate = new Date(c.memory.auditLogs[0].createdAt);
            }
            else if (c.memory?.lastInteraction) {
                saleTimestampDate = new Date(c.memory.lastInteraction);
            }
            else if (c.memory?.updatedAt) {
                saleTimestampDate = new Date(c.memory.updatedAt);
            }
            else {
                saleTimestampDate = new Date();
            }
            const saleTimestamp = saleTimestampDate.toISOString();
            const saleDate = formatDateInTimezone(saleTimestampDate, 'America/Caracas');
            let amount = detectedReceipt?.amount || 0;
            let currency = detectedReceipt?.currency || 'BS';
            if (!amount || amount === 0) {
                const matchedCatalog = productPricesMap[primaryProduct.toLowerCase()];
                if (matchedCatalog && matchedCatalog.price > 0) {
                    amount = matchedCatalog.price;
                    currency = matchedCatalog.currency;
                }
                else if (defaultTenantPrice > 0) {
                    amount = defaultTenantPrice;
                    currency = defaultTenantCurrency;
                }
                else {
                    amount = 0;
                    currency = defaultTenantCurrency;
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
        const recentSaleDates = Array.from(new Set(allSales.map(s => s.saleDate)))
            .sort((a, b) => b.localeCompare(a))
            .slice(0, 10);
        let filteredSales = allSales;
        if (mode === 'day') {
            filteredSales = filteredSales.filter(s => s.saleDate === selectedDate);
        }
        else if (mode === 'range' && query.startDate && query.endDate) {
            filteredSales = filteredSales.filter(s => s.saleDate >= query.startDate && s.saleDate <= query.endDate);
        }
        if (query.product && query.product !== 'all') {
            const prodFilter = query.product.toLowerCase().trim();
            filteredSales = filteredSales.filter(s => s.primaryProduct.toLowerCase().includes(prodFilter) ||
                s.products.some(p => p.toLowerCase().includes(prodFilter)));
        }
        if (query.search && query.search.trim()) {
            const q = query.search.toLowerCase().trim();
            filteredSales = filteredSales.filter(s => s.clientName.toLowerCase().includes(q) ||
                s.phone.toLowerCase().includes(q) ||
                (s.reference && s.reference.toLowerCase().includes(q)));
        }
        filteredSales.sort((a, b) => new Date(b.saleTimestamp).getTime() - new Date(a.saleTimestamp).getTime());
        let totalRevenueBs = 0;
        let totalRevenueUsd = 0;
        let bsSalesCount = 0;
        let verifiedReceiptsCount = 0;
        const productStatsMap = {};
        const methodStatsMap = {};
        for (const sale of filteredSales) {
            if (sale.currency === 'USD') {
                totalRevenueUsd += sale.amount;
            }
            else {
                totalRevenueBs += sale.amount;
                bsSalesCount++;
            }
            if (sale.hasReceipt)
                verifiedReceiptsCount++;
            const pName = sale.primaryProduct;
            if (!productStatsMap[pName]) {
                productStatsMap[pName] = { count: 0, bs: 0, usd: 0 };
            }
            productStatsMap[pName].count++;
            if (sale.currency === 'USD')
                productStatsMap[pName].usd += sale.amount;
            else
                productStatsMap[pName].bs += sale.amount;
            const method = sale.paymentMethod;
            methodStatsMap[method] = (methodStatsMap[method] || 0) + 1;
        }
        const totalSales = filteredSales.length;
        const averageTicketBs = bsSalesCount > 0 ? Math.round(totalRevenueBs / bsSalesCount) : 0;
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
    async getDailyVolume(tenantId) {
        const days = 7;
        const result = [];
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
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = AnalyticsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map