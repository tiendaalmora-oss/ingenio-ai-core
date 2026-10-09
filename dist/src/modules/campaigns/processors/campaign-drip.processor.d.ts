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
    handleDripDispatch(): Promise<void>;
    private processSingleCampaign;
}
