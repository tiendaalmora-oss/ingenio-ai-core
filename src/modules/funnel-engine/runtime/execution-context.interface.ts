export interface ExecutionContext {
  tenantId: string;
  sessionId: string;
  triggerEvent: any; // e.g. original incoming message
  state: Record<string, any>; // dynamic memory/variables during execution
  logs: any[];
}
