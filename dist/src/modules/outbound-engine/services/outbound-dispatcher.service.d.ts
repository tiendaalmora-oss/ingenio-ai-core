import { PrismaService } from '../../../shared/database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WahaAdapterService } from './waha-adapter.service';
export declare class OutboundDispatcherService {
    private readonly prisma;
    private readonly wahaAdapter;
    private readonly eventEmitter;
    private readonly logger;
    private metrics;
    constructor(prisma: PrismaService, wahaAdapter: WahaAdapterService, eventEmitter: EventEmitter2);
    processPendingMessages(): Promise<void>;
    getMetrics(): {
        pending: number;
        sent: number;
        failed: number;
        retry: number;
    };
}
