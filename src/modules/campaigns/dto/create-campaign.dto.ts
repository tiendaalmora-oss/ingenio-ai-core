export class TargetFiltersDto {
  leadStatus?: string; // 'ALL' | 'CLOSED' | 'WARM' | 'HOT' | 'COLD'
  product?: string;    // 'ALL' | specific product name (mantenido por compatibilidad)
  products?: string[]; // Múltiples productos seleccionados en la misma campaña
  tags?: string[];
}

export class CreateCampaignDto {
  name!: string;
  channel?: 'WHATSAPP' | 'EMAIL' | 'BOTH';
  targetFilters?: TargetFiltersDto;
  messageTemplate!: string;
  mediaUrl?: string;
  mediaType?: 'IMAGE' | 'DOCUMENT';
  mediaFilename?: string;
  subject?: string;
  dripIntervalSeconds?: number;
  autoStart?: boolean;
}

export class EstimateAudienceDto {
  leadStatus?: string;
  product?: string;
  products?: string[];
  tags?: string[];
  channel?: 'WHATSAPP' | 'EMAIL' | 'BOTH';
}
