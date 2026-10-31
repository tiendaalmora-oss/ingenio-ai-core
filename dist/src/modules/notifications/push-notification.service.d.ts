import { PrismaService } from '../../shared/database/prisma.service';
export interface SalePushData {
    productName: string;
    customerName?: string;
    amountFormatted: string;
    reference?: string;
}
export declare class PushNotificationService {
    private readonly prisma;
    private readonly logger;
    private readonly publicKey;
    private readonly privateKey;
    private readonly subject;
    constructor(prisma: PrismaService);
    getPublicKey(): {
        publicKey: string;
    };
    getSubscriptions(): Promise<any>;
    saveSubscription(data: {
        endpoint: string;
        p256dh: string;
        auth: string;
        tenantId?: string | null;
        role?: string;
        device?: string;
    }): Promise<{
        success: boolean;
        id: any;
    }>;
    removeSubscription(endpoint: string): Promise<{
        success: boolean;
    }>;
    notifySale(tenantId: string | null | undefined, sale: SalePushData): Promise<{
        sent: number;
        failed: number;
        error?: undefined;
    } | {
        sent: number;
        failed: number;
        error: any;
    }>;
    sendTestPush(endpoint: string): Promise<{
        success: boolean;
        error: string;
    } | {
        success: boolean;
        error?: undefined;
    }>;
}
