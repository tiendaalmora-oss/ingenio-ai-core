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