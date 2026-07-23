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
var WahaAdapterService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WahaAdapterService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../shared/database/prisma.service");
let WahaAdapterService = WahaAdapterService_1 = class WahaAdapterService {
    prisma;
    logger = new common_1.Logger(WahaAdapterService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async sendMessage(tenantId, contactId, content) {
        this.logger.log(`Enviando mensaje vía WAHA a ${contactId}...`);
        const wahaUrl = process.env.WAHA_API_URL;
        if (!wahaUrl) {
            throw new Error('WAHA_API_URL is not configured');
        }
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        const session = tenant?.wahaSession || 'default';
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
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WahaAdapterService);
//# sourceMappingURL=waha-adapter.service.js.map