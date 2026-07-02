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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FakeController = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const fake_event_1 = require("../events/out/fake.event");
let FakeController = class FakeController {
    eventEmitter;
    constructor(eventEmitter) {
        this.eventEmitter = eventEmitter;
    }
    triggerEvent() {
        const event = new fake_event_1.FakeEventTriggered('tenant-1', 'Prueba de Aislamiento Estructural Exitosa', Date.now());
        this.eventEmitter.emit('fake.event.triggered', event);
        return { status: 'Event Emitted', eventId: event.eventId };
    }
};
exports.FakeController = FakeController;
__decorate([
    (0, common_1.Get)('trigger'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], FakeController.prototype, "triggerEvent", null);
exports.FakeController = FakeController = __decorate([
    (0, common_1.Controller)('test'),
    __metadata("design:paramtypes", [event_emitter_1.EventEmitter2])
], FakeController);
//# sourceMappingURL=fake.controller.js.map