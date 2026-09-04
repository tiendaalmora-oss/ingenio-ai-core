import { AutomationDsl } from '../automation-compiler.service';
import { ExecutionContext } from './execution-context.interface';
import { NodeExecutorService } from './node-executor.service';
import { RuntimeLoggerService } from './runtime-logger.service';
export declare class RuntimeEngineService {
    private readonly executor;
    private readonly runtimeLogger;
    private readonly logger;
    constructor(executor: NodeExecutorService, runtimeLogger: RuntimeLoggerService);
    parseReactFlowToDsl(reactFlowJson: any): AutomationDsl;
    executeFlow(dsl: AutomationDsl, context: ExecutionContext): Promise<void>;
}
