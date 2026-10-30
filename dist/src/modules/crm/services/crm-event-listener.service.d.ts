import { PrismaService } from '../../../shared/database/prisma.service';
import { PushNotificationService } from '../../notifications/push-notification.service';
export declare class CrmEventListenerService {
    private readonly prisma;
    private readonly pushNotificationService;
    private readonly logger;
    constructor(prisma: PrismaService, pushNotificationService: PushNotificationService);
    handleMemoryUpdated(payload: any): Promise<void>;
    handleTaskCreated(payload: any): Promise<void>;
    handleHandoffRequested(payload: any): Promise<void>;
    handleMessageSent(payload: any): Promise<void>;
}
