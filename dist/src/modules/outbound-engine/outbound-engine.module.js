"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboundEngineModule = void 0;
const common_1 = require("@nestjs/common");
const waha_adapter_service_1 = require("./services/waha-adapter.service");
const outbound_listener_service_1 = require("./services/outbound-listener.service");
let OutboundEngineModule = class OutboundEngineModule {
};
exports.OutboundEngineModule = OutboundEngineModule;
exports.OutboundEngineModule = OutboundEngineModule = __decorate([
    (0, common_1.Module)({
        providers: [waha_adapter_service_1.WahaAdapterService, outbound_listener_service_1.OutboundListenerService],
    })
], OutboundEngineModule);
//# sourceMappingURL=outbound-engine.module.js.map