"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var WahaAdapterService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WahaAdapterService = void 0;
const common_1 = require("@nestjs/common");
let WahaAdapterService = WahaAdapterService_1 = class WahaAdapterService {
    logger = new common_1.Logger(WahaAdapterService_1.name);
    async sendMessage(contactId, content) {
        this.logger.log(`Enviando mensaje vía WAHA a ${contactId}...`);
        const wahaUrl = process.env.WAHA_API_URL || 'http://localhost:3001';
        const session = process.env.WAHA_SESSION || 'default';
        const apiKey = process.env.WAHA_API_KEY || '';
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        if (apiKey) {
            headers['X-Api-Key'] = apiKey;
        }
        try {
            const response = await fetch(`${wahaUrl}/api/sendText`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    chatId: contactId,
                    text: content,
                    session: session
                })
            });
            if (!response.ok) {
                throw new Error(`WAHA respondió con error: ${response.status} ${response.statusText}`);
            }
            const result = await response.json();
            this.logger.log(`WAHA confirmó el envío. ID: ${result.id || 'N/A'}`);
            return result.id || `waha_msg_${Date.now()}`;
        }
        catch (error) {
            this.logger.error(`Error de conexión con WAHA: ${error.message}`);
            throw error;
        }
    }
};
exports.WahaAdapterService = WahaAdapterService;
exports.WahaAdapterService = WahaAdapterService = WahaAdapterService_1 = __decorate([
    (0, common_1.Injectable)()
], WahaAdapterService);
//# sourceMappingURL=waha-adapter.service.js.map