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
export interface SalesFilterQuery {
    date?: string;
    startDate?: string;
    endDate?: string;
    product?: string;
    search?: string;
}
export interface SaleItem {
    id: string;
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
    saleDate: string;
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
export declare class AnalyticsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getSummary(tenantId: string): Promise<AnalyticsSummary>;
    getSalesDashboard(tenantId: string, query?: SalesFilterQuery): Promise<SalesDashboardData>;
    private getDailyVolume;
}
