import { AnalyticsService } from './analytics.service';
export declare class AnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    getSummary(tenantId: string): Promise<import("./analytics.service").AnalyticsSummary>;
    getSales(tenantId: string, date?: string, startDate?: string, endDate?: string, product?: string, search?: string): Promise<import("./analytics.service").SalesDashboardData>;
}
