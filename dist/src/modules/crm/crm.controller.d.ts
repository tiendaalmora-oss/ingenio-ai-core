import { PrismaService } from '../../shared/database/prisma.service';
export declare class CrmController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getLeads(tenantId: string, search?: string, stage?: string, page?: string, limit?: string): Promise<{
        total: number;
        page: number;
        kanban: Record<string, {
            id: string;
            name: string;
            phone: string | null;
            company: string | null;
            leadStatus: string;
            kanbanStage: string;
            score: number;
            interests: string[];
            objections: string[];
            tags: string[];
            lastInteraction: Date | null;
            hoursSinceLastContact: number | null;
            conversationCount: number;
            interactionCount: number;
            activeFunnelId: string | null;
            activeFunnelStep: string | null;
            pendingTasks: number;
            lastMessageContent: string;
            lastMessageDirection: string;
        }[]>;
        leads: {
            id: string;
            name: string;
            phone: string | null;
            company: string | null;
            leadStatus: string;
            kanbanStage: string;
            score: number;
            interests: string[];
            objections: string[];
            tags: string[];
            lastInteraction: Date | null;
            hoursSinceLastContact: number | null;
            conversationCount: number;
            interactionCount: number;
            activeFunnelId: string | null;
            activeFunnelStep: string | null;
            pendingTasks: number;
            lastMessageContent: string;
            lastMessageDirection: string;
        }[];
    }>;
    createLead(tenantId: string, body: {
        name: string;
        phone: string;
        company?: string;
        interests?: string[];
        tags?: string[];
        leadStatus?: string;
    }): Promise<{
        success: boolean;
        leadId: string;
    }>;
    getLead(id: string, tenantId: string): Promise<{
        error: string;
        id?: undefined;
        name?: undefined;
        phone?: undefined;
        company?: undefined;
        leadStatus?: undefined;
        score?: undefined;
        interests?: undefined;
        objections?: undefined;
        tags?: undefined;
        lastInteraction?: undefined;
        conversations?: undefined;
        tasks?: undefined;
    } | {
        id: string;
        name: string;
        phone: string | null;
        company: string | null;
        leadStatus: string;
        score: number;
        interests: string[];
        objections: string[];
        tags: string[];
        lastInteraction: Date | null;
        conversations: {
            id: string;
            status: string;
            messageCount: number;
            activeFunnel: {
                funnelId: string;
                step: string;
            } | null;
            messages: {
                id: string;
                direction: string;
                content: string;
                role: string | null;
                timestamp: Date;
            }[];
        }[];
        tasks: {
            id: string;
            status: string;
            createdAt: Date;
            contactId: string;
            title: string;
            dueDate: Date | null;
        }[];
        error?: undefined;
    }>;
    patchStage(id: string, body: {
        stage: string;
    }, tenantId: string): Promise<{
        id: string;
        kanbanStage: string;
        leadStatus: string;
    }>;
    patchMemory(id: string, body: {
        name?: string;
        company?: string;
        interests?: string[];
        tags?: string[];
        leadStatus?: string;
        objections?: string[];
    }, tenantId: string): Promise<{
        id: string;
        memory: {
            id: string;
            name: string | null;
            updatedAt: Date;
            contactId: string;
            company: string | null;
            interests: string[];
            lastInteraction: Date | null;
            objections: string[];
            leadStatus: string | null;
            tags: string[];
        };
    }>;
    getAlerts(tenantId: string): Promise<{
        urgentCount: number;
        totalAlerts: number;
        alerts: any[];
    }>;
    deleteLead(id: string, tenantId: string): Promise<{
        success: boolean;
        deletedId: string;
    }>;
}
