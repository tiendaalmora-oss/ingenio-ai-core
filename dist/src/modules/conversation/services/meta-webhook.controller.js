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
exports.MetaWebhookController = void 0;
const common_1 = require("@nestjs/common");
const receive_message_service_1 = require("./receive-message.service");
const tenant_resolver_service_1 = require("../../tenant/services/tenant-resolver.service");
let MetaWebhookController = class MetaWebhookController {
    receiveMessageService;
    tenantResolver;
    constructor(receiveMessageService, tenantResolver) {
        this.receiveMessageService = receiveMessageService;
        this.tenantResolver = tenantResolver;
    }
    verifyToken(query, res) {
        if (query['hub.mode'] === 'subscribe' && query['hub.challenge']) {
            return res.status(common_1.HttpStatus.OK).send(query['hub.challenge']);
        }
        return res.status(common_1.HttpStatus.BAD_REQUEST).send('Bad Request');
    }
    async receiveMessage(body, res) {
        console.log('[1] Webhook recibido');
        console.log("WEBHOOK RECIBIDO");
        console.log(JSON.stringify(body, null, 2));
        res.status(common_1.HttpStatus.OK).send('EVENT_RECEIVED');
        try {
            let tenantId = await this.tenantResolver.resolveFromWahaSession(body.session);
            let contactId = '';
            let content = '';
            if (body.event === 'message' || body.event === 'message.any') {
                if (body.payload.fromMe) {
                    console.log('Ignorando mensaje saliente (fromMe: true)');
                    return;
                }
                if (body.event === 'message.any') {
                    return;
                }
                contactId = body.payload.from;
                content = body.payload.body;
                if (contactId && contactId.endsWith('@g.us')) {
                    console.log(`Ignorando mensaje de grupo: ${contactId}`);
                    return;
                }
            }
            else {
                contactId = body.contactId || 'contact-demo-123';
                content = body.content || 'Mensaje de prueba desde webhook';
            }
            if (!contactId || !content) {
                console.warn('Ignorando evento webhook sin contactId o content');
                return;
            }
            await this.receiveMessageService.execute(tenantId, contactId, content);
        }
        catch (error) {
            console.error('Error processing Meta Webhook in background:', error);
        }
    }
};
exports.MetaWebhookController = MetaWebhookController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], MetaWebhookController.prototype, "verifyToken", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MetaWebhookController.prototype, "receiveMessage", null);
exports.MetaWebhookController = MetaWebhookController = __decorate([
    (0, common_1.Controller)('webhooks/meta'),
    __metadata("design:paramtypes", [receive_message_service_1.ReceiveMessageService,
        tenant_resolver_service_1.TenantResolverService])
], MetaWebhookController);
//# sourceMappingURL=meta-webhook.controller.js.map