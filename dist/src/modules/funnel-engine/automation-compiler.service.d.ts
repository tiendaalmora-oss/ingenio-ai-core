export interface DslStep {
    id: string;
    type: string;
    name: string;
    description?: string;
    next?: string;
    onTrue?: string;
    onFalse?: string;
}
export interface AutomationDsl {
    steps: DslStep[];
}
export declare class AutomationCompilerService {
    private readonly logger;
    compileToReactFlow(dsl: AutomationDsl): any;
}
