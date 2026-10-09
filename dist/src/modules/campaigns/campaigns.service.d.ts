import { PrismaService } from '../../shared/database/prisma.service';
import { CreateCampaignDto, EstimateAudienceDto } from './dto/create-campaign.dto';
export declare class CampaignsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    private buildAudienceWhere;
    renderMessage(template: string, contact: {
        name?: string | null;
        phone?: string | null;
        interests?: string[];
    }): string;
    estimateAudience(tenantId: string, filters?: EstimateAudienceDto): Promise<{
        totalCount: number;
        sampleContacts: {
            id: string;
            name: string;
            phone: string;
            leadStatus: string;
            interests: string[];
            tags: string[];
        }[];
    }>;
    getAvailableFilterOptions(tenantId: string): Promise<{
        products: string[];
        tags: string[];
    }>;
    createCampaign(tenantId: string, dto: CreateCampaignDto): Promise<{
        success: boolean;
        campaign: {
            id: string;
            name: string;
            channel: string;
            status: string;
            totalRecipients: number;
            dripIntervalSeconds: number;
        };
    }>;
    listCampaigns(tenantId: string): Promise<{
        id: string;
        name: string;
        channel: string;
        status: string;
        totalRecipients: number;
        sentCount: number;
        failedCount: number;
        dripIntervalSeconds: number;
        mediaUrl: string | null;
        mediaType: string | null;
        createdAt: string;
        updatedAt: string;
        progressPercentage: number;
    }[]>;
    getCampaignDetails(tenantId: string, campaignId: string): Promise<{
        progressPercentage: number;
        items: {
            id: string;
            status: string;
            createdAt: Date;
            sentAt: Date | null;
            recipientPhone: string | null;
            recipientName: string | null;
            errorMessage: string | null;
        }[];
        id: string;
        name: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        subject: string | null;
        channel: string;
        targetFilters: import("@prisma/client/runtime/client").JsonValue | null;
        totalRecipients: number;
        sentCount: number;
        failedCount: number;
        messageTemplate: string;
        mediaUrl: string | null;
        mediaType: string | null;
        mediaFilename: string | null;
        dripIntervalSeconds: number;
        botResponseMode: string;
    }>;
    pauseCampaign(tenantId: string, campaignId: string): Promise<{
        success: boolean;
        message: string;
        status: string;
    }>;
    resumeCampaign(tenantId: string, campaignId: string): Promise<{
        success: boolean;
        message: string;
        status: string;
    }>;
    cancelCampaign(tenantId: string, campaignId: string): Promise<{
        success: boolean;
        message: string;
        status: string;
    }>;
}
