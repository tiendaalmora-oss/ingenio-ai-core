export declare class TargetFiltersDto {
    leadStatus?: string;
    product?: string;
    tags?: string[];
}
export declare class CreateCampaignDto {
    name: string;
    channel?: 'WHATSAPP' | 'EMAIL' | 'BOTH';
    targetFilters?: TargetFiltersDto;
    messageTemplate: string;
    mediaUrl?: string;
    mediaType?: 'IMAGE' | 'DOCUMENT';
    mediaFilename?: string;
    subject?: string;
    dripIntervalSeconds?: number;
    autoStart?: boolean;
}
export declare class EstimateAudienceDto {
    leadStatus?: string;
    product?: string;
    tags?: string[];
    channel?: 'WHATSAPP' | 'EMAIL' | 'BOTH';
}
