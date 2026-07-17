import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class RuntimeLoggerService {
  private readonly logger = new Logger(RuntimeLoggerService.name);

  constructor(private eventEmitter: EventEmitter2) {}

  logStep(tenantId: string, sessionId: string, stepId: string, type: string, message: string, data?: any) {
    this.logger.log(`[Runtime ${tenantId}][${sessionId}] Node ${stepId} (${type}): ${message}`);
    
    // Emit for real-time dashboard or observability
    this.eventEmitter.emit('runtime.log', {
      tenantId,
      sessionId,
      stepId,
      type,
      message,
      data,
      timestamp: new Date()
    });
  }
}
