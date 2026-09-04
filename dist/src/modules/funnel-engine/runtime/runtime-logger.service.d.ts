import { EventEmitter2 } from '@nestjs/event-emitter';
export declare class RuntimeLoggerService {
    private eventEmitter;
    private readonly logger;
    constructor(eventEmitter: EventEmitter2);
    logStep(tenantId: string, sessionId: string, stepId: string, type: string, message: string, data?: any): void;
}
