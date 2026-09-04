import { PrismaService } from '../../shared/database/prisma.service';
export interface AnalyticsSummary {
    funnel: {
        totalLeads: number;
        cold: number;
        warm: number;
        hot: number;
        closed: number;
        handoff: number;
        conversionRate: number;
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
        reactivationRate: number;
    };
    topTags: Array<{
        tag: string;
        count: number;
    }>;
    topObjections: Array<{
        objection: string;
        count: number;
    }>;
    dailyVolume: Array<{
        date: string;
        inbound: number;
        outbound: number;
    }>;
}
export declare class AnalyticsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getSummary(tenantId: string): Promise<AnalyticsSummary>;
    private getDailyVolume;
}
