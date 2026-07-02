import { PrismaService } from '../../../shared/database/prisma.service';
export declare class CrmEventListenerService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    handleMemoryUpdated(payload: any): Promise<void>;
    handleTaskCreated(payload: any): Promise<void>;
    handleHandoffRequested(payload: any): Promise<void>;
    handleMessageSent(payload: any): Promise<void>;
}
