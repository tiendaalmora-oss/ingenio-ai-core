import { EventEmitter2 } from '@nestjs/event-emitter';
import { WahaAdapterService } from './waha-adapter.service';
import { ResponseGeneratedEvent } from '../../llm-orchestrator';
import { PrismaService } from '../../../shared/database/prisma.service';
export declare class OutboundListenerService {
    private readonly wahaAdapter;
    private readonly eventEmitter;
    private readonly prisma;
    private readonly logger;
    constructor(wahaAdapter: WahaAdapterService, eventEmitter: EventEmitter2, prisma: PrismaService);
    handleResponseGenerated(payload: ResponseGeneratedEvent): Promise<void>;
}
