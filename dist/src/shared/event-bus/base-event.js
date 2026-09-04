"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVENT_TYPES = exports.BaseEvent = void 0;
const event_types_constants_1 = require("./constants/event-types.constants");
Object.defineProperty(exports, "EVENT_TYPES", { enumerable: true, get: function () { return event_types_constants_1.EVENT_TYPES; } });
const os = __importStar(require("os"));
class BaseEvent {
    type;
    correlationId;
    tenantId;
    payload;
    eventId;
    timestamp;
    eventVersion;
    metadata;
    constructor(type, correlationId, tenantId, payload, metadataOverrides) {
        this.type = type;
        this.correlationId = correlationId;
        this.tenantId = tenantId;
        this.payload = payload;
        this.eventId = crypto.randomUUID();
        this.timestamp = new Date().toISOString();
        this.eventVersion = 1;
        this.metadata = {
            source: metadataOverrides?.source || 'ingenio-ai-core',
            version: metadataOverrides?.version || '1.0.0',
            environment: metadataOverrides?.environment || process.env.NODE_ENV || 'development',
            hostname: metadataOverrides?.hostname || os.hostname(),
            service: metadataOverrides?.service || 'core-service',
            ...metadataOverrides,
        };
    }
}
exports.BaseEvent = BaseEvent;
//# sourceMappingURL=base-event.js.map