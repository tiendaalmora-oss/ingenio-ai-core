import { PushNotificationService } from './push-notification.service';
export declare class NotificationsController {
    private readonly pushService;
    constructor(pushService: PushNotificationService);
    getPublicKey(): {
        publicKey: string;
    };
    getSubscriptions(): Promise<any>;
    subscribe(body: {
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
    unsubscribe(body: {
        endpoint: string;
    }): Promise<{
        success: boolean;
    }>;
    testPush(body: {
        endpoint: string;
    }): Promise<{
        success: boolean;
        error: string;
    } | {
        success: boolean;
        error?: undefined;
    }>;
}
