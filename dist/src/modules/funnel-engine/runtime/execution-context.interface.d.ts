export interface ExecutionContext {
    tenantId: string;
    sessionId: string;
    triggerEvent: any;
    state: Record<string, any>;
    logs: any[];
}
