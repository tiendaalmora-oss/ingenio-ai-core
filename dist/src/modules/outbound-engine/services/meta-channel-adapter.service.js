"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MetaChannelAdapterService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaChannelAdapterService = void 0;
const common_1 = require("@nestjs/common");
let MetaChannelAdapterService = MetaChannelAdapterService_1 = class MetaChannelAdapterService {
    logger = new common_1.Logger(MetaChannelAdapterService_1.name);
    async sendMessage(recipientId, text) {
        const cleanRecipientId = recipientId.replace(/^(ig_|instagram_|fb_|messenger_)/, '');
        const accessToken = process.env.META_PAGE_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || '';
        if (!accessToken) {
            this.logger.warn(`META_PAGE_ACCESS_TOKEN no está configurado. No se pudo enviar mensaje a ${recipientId}`);
            return 'meta-mock-id';
        }
        try {
            const response = await fetch(`https://graph.facebook.com/v20.0/me/messages?access_token=${accessToken}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient: { id: cleanRecipientId },
                    message: { text }
                })
            });
            if (!response.ok) {
                const errText = await response.text();
                this.logger.error(`Error enviando mensaje a Meta (Instagram/FB) (${response.status}): ${errText}`);
                throw new Error(`Meta API error: ${errText}`);
            }
            const data = await response.json();
            this.logger.log(`Mensaje enviado con éxito por Meta (Instagram/FB) a ${cleanRecipientId}: ${data.message_id || data.recipient_id}`);
            return data.message_id || 'meta-msg-ok';
        }
        catch (err) {
            this.logger.error(`Excepción enviando mensaje por Meta a ${recipientId}: ${err.message}`);
            throw err;
        }
    }
};
exports.MetaChannelAdapterService = MetaChannelAdapterService;
exports.MetaChannelAdapterService = MetaChannelAdapterService = MetaChannelAdapterService_1 = __decorate([
    (0, common_1.Injectable)()
], MetaChannelAdapterService);
//# sourceMappingURL=meta-channel-adapter.service.js.map