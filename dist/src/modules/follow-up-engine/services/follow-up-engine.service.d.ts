import { PrismaService } from '../../../shared/database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
export declare class FollowUpEngineService {
    private prisma;
    private eventEmitter;
    private readonly logger;
    private readonly DEFAULT_START_HOUR;
    private readonly DEFAULT_END_HOUR;
    constructor(prisma: PrismaService, eventEmitter: EventEmitter2);
    evaluateFollowUps(): Promise<any>;
    private extractFollowUpRules;
    private isWithinAllowedWindow;
    private parseDelayMs;
}
