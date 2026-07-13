import { EventEmitter2 } from '@nestjs/event-emitter';
import { ToolCalledEvent } from '../../llm-orchestrator';
import { PrismaService } from '../../../shared/database/prisma.service';
export declare class ToolCallListenerService {
    private readonly eventEmitter;
    private readonly prisma;
    private readonly logger;
    constructor(eventEmitter: EventEmitter2, prisma: PrismaService);
    handleToolCall(payload: ToolCalledEvent): Promise<void>;
}
