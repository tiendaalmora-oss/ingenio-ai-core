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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsController = void 0;
const common_1 = require("@nestjs/common");
const push_notification_service_1 = require("./push-notification.service");
let NotificationsController = class NotificationsController {
    pushService;
    constructor(pushService) {
        this.pushService = pushService;
    }
    getPublicKey() {
        return this.pushService.getPublicKey();
    }
    async getSubscriptions() {
        return this.pushService.getSubscriptions();
    }
    async subscribe(body) {
        if (!body.endpoint || !body.p256dh || !body.auth) {
            throw new common_1.BadRequestException('Faltan datos de suscripción push (endpoint, p256dh o auth)');
        }
        return this.pushService.saveSubscription(body);
    }
    async unsubscribe(body) {
        if (!body.endpoint) {
            throw new common_1.BadRequestException('Endpoint requerido');
        }
        return this.pushService.removeSubscription(body.endpoint);
    }
    async testPush(body) {
        if (!body.endpoint) {
            throw new common_1.BadRequestException('Endpoint requerido');
        }
        return this.pushService.sendTestPush(body.endpoint);
    }
};
exports.NotificationsController = NotificationsController;
__decorate([
    (0, common_1.Get)('public-key'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "getPublicKey", null);
__decorate([
    (0, common_1.Get)('subscriptions'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "getSubscriptions", null);
__decorate([
    (0, common_1.Post)('subscribe'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "subscribe", null);
__decorate([
    (0, common_1.Post)('unsubscribe'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "unsubscribe", null);
__decorate([
    (0, common_1.Post)('test'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "testPush", null);
exports.NotificationsController = NotificationsController = __decorate([
    (0, common_1.Controller)('notifications/push'),
    __metadata("design:paramtypes", [push_notification_service_1.PushNotificationService])
], NotificationsController);
//# sourceMappingURL=notifications.controller.js.map