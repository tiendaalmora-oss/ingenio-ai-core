import { PrismaService } from '../../../shared/database/prisma.service';
import { WahaAdapterService } from '../../outbound-engine/services/waha-adapter.service';
import { EmailSenderService } from '../services/email-sender.service';
export declare class CampaignDripProcessor {
    private readonly prisma;
    private readonly wahaAdapter;
    private readonly emailSender;
    private readonly logger;
    private isProcessing;
    constructor(prisma: PrismaService, wahaAdapter: WahaAdapterService, emailSender: EmailSenderService);
    private readonly MAX_CAMPAIGN_WHATSAPP_PER_HOUR;
    private readonly MAX_CAMPAIGN_WHATSAPP_PER_DAY;
    private readonly ALLOWED_START_HOUR;
    private readonly ALLOWED_END_HOUR;
    private isWithinAllowedWindow;
    handleDripDispatch(): Promise<void>;
    private processSingleCampaign;
}
