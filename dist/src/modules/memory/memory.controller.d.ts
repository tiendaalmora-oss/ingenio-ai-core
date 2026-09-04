import { PrismaService } from '../../shared/database/prisma.service';
export declare class MemoryController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getTimeline(tenantId: string, search?: string, field?: string, source?: string, page?: string, limit?: string): Promise<{
        total: number;
        page: number;
        data: {
            id: string;
            contactId: string;
            contactName: string;
            company: string | null;
            tenantId: string;
            field: string;
            previousValue: any;
            newValue: any;
            source: string;
            skill: string | null;
            confidence: number;
            conversationId: string | null;
            createdAt: Date;
        }[];
    }>;
    getContactMemory(contactId: string, tenantId: string): Promise<{
        contactId: string;
        memory: null;
        timeline: never[];
        contactName?: undefined;
        phone?: undefined;
        tenantId?: undefined;
    } | {
        contactId: string;
        contactName: string;
        phone: string | null;
        tenantId: string;
        memory: {
            id: string;
            name: string | null;
            company: string | null;
            interests: string[];
            objections: string[];
            leadStatus: string | null;
            tags: string[];
            lastInteraction: Date | null;
            updatedAt: Date;
        };
        timeline: {
            id: string;
            field: string;
            previousValue: any;
            newValue: any;
            source: string;
            skill: string | null;
            confidence: number;
            conversationId: string | null;
            createdAt: Date;
        }[];
    }>;
    getByCompany(tenantId: string): Promise<{
        companies: any[];
    }>;
    getStats(tenantId: string): Promise<{
        totalLeadsWithMemory: number;
        totalLearningEvents: number;
        fieldBreakdown: {
            field: string;
            count: number;
        }[];
        recentActivity: {
            id: string;
            contactName: string;
            company: string | null;
            field: string;
            source: string;
            skill: string | null;
            createdAt: Date;
        }[];
    }>;
    private _parse;
}
