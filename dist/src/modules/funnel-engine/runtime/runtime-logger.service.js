"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var RuntimeLoggerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeLoggerService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
let RuntimeLoggerService = RuntimeLoggerService_1 = class RuntimeLoggerService {
    eventEmitter;
    logger = new common_1.Logger(RuntimeLoggerService_1.name);
    constructor(eventEmitter) {
        this.eventEmitter = eventEmitter;
    }
    logStep(tenantId, sessionId, stepId, type, message, data) {
        this.logger.log(`[Runtime ${tenantId}][${sessionId}] Node ${stepId} (${type}): ${message}`);
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
};
exports.RuntimeLoggerService = RuntimeLoggerService;
exports.RuntimeLoggerService = RuntimeLoggerService = RuntimeLoggerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_emitter_1.EventEmitter2])
], RuntimeLoggerService);
//# sourceMappingURL=runtime-logger.service.js.map