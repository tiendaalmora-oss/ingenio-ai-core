import { EventEmitter2 } from '@nestjs/event-emitter';
import { DslStep } from '../automation-compiler.service';
import { ExecutionContext } from './execution-context.interface';
import { RuntimeLoggerService } from './runtime-logger.service';
export declare class NodeExecutorService {
    private readonly runtimeLogger;
    private readonly eventEmitter;
    private readonly logger;
    constructor(runtimeLogger: RuntimeLoggerService, eventEmitter: EventEmitter2);
    execute(step: DslStep, context: ExecutionContext): Promise<string | null>;
    private executeEvent;
    private executeAi;
    private executeCrm;
    private executeWhatsapp;
    private executeSkill;
    private executeCondition;
    private executeAutomation;
}
