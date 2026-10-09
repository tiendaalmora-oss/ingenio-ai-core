import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
export declare class CampaignsController {
    private readonly campaignsService;
    constructor(campaignsService: CampaignsService);
    estimateAudience(tenantId: string, leadStatus?: string, product?: string, tags?: string, channel?: 'WHATSAPP' | 'EMAIL' | 'BOTH'): Promise<{
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
    getFilterOptions(tenantId: string): Promise<{
        products: string[];
        tags: string[];
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
    getCampaignDetails(tenantId: string, id: string): Promise<{
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
    createCampaign(tenantId: string, body: CreateCampaignDto): Promise<{
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
    pauseCampaign(tenantId: string, id: string): Promise<{
        success: boolean;
        message: string;
        status: string;
    }>;
    resumeCampaign(tenantId: string, id: string): Promise<{
        success: boolean;
        message: string;
        status: string;
    }>;
    cancelCampaign(tenantId: string, id: string): Promise<{
        success: boolean;
        message: string;
        status: string;
    }>;
}
