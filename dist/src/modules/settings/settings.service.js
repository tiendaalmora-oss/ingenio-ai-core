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
var SettingsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
const event_emitter_1 = require("@nestjs/event-emitter");
let SettingsService = SettingsService_1 = class SettingsService {
    prisma;
    eventEmitter;
    logger = new common_1.Logger(SettingsService_1.name);
    constructor(prisma, eventEmitter) {
        this.prisma = prisma;
        this.eventEmitter = eventEmitter;
    }
    async getSettings(tenantId) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            include: { knowledgeBundle: true },
        });
        const wahaApiUrl = process.env.WAHA_API_URL || 'https://waha.ingeniodigital.shop';
        const wahaSession = tenant?.wahaSession || process.env.WAHA_SESSION || 'ferreos';
        const aiProvider = process.env.AI_PROVIDER || 'openrouter';
        const aiModel = process.env.AI_MODEL || 'google/gemini-2.5-flash-lite';
        const aiBaseUrl = process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1';
        return {
            tenant: {
                id: tenant?.id,
                name: tenant?.name || 'Mi Empresa',
                wahaSession: tenant?.wahaSession || 'ferreos',
                currentBundleVersion: tenant?.currentBundleVersion || 'v1',
                createdAt: tenant?.createdAt,
            },
            waha: {
                apiUrl: wahaApiUrl,
                session: wahaSession,
                hasApiKey: !!process.env.WAHA_API_KEY,
                status: 'CONNECTED',
            },
            ai: {
                provider: aiProvider,
                model: aiModel,
                baseUrl: aiBaseUrl,
                hasApiKey: !!process.env.AI_API_KEY,
            },
            meta: {
                webhookUrl: '/webhooks/meta',
                verifyTokenConfigured: true,
                supportedChannels: ['whatsapp', 'instagram', 'facebook'],
            },
        };
    }
    async updateTenantSettings(tenantId, data) {
        this.logger.log(`Updating tenant settings for ${tenantId}: ${JSON.stringify(data)}`);
        const updated = await this.prisma.tenant.update({
            where: { id: tenantId },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.wahaSession && { wahaSession: data.wahaSession }),
            },
        });
        return updated;
    }
    async cleanSlate(tenantId) {
        this.logger.warn(`Clean slate requested for tenant ${tenantId}`);
        await this.prisma.memoryAuditLog.deleteMany({ where: { tenantId } });
        await this.prisma.businessMemory.deleteMany({ where: { contact: { tenantId } } });
        await this.prisma.task.deleteMany({ where: { contact: { tenantId } } });
        await this.prisma.interaction.deleteMany({ where: { conversation: { contact: { tenantId } } } });
        await this.prisma.conversation.deleteMany({ where: { contact: { tenantId } } });
        await this.prisma.contact.deleteMany({ where: { tenantId } });
        await this.prisma.pendingOutboundMessage.deleteMany({ where: { tenantId } });
        const emptyBundlePrompt = {
            _raw: {
                identidad: { nombre: 'Asistente Virtual', tono: 'Profesional, empático y vendedor' },
                empresa: { nombre: '', descripcion: '', sitioWeb: '' },
                productos: [],
                categorias: [],
                servicios: [],
                faqs: [],
                objeciones: [],
                scriptsComerciales: [],
                promociones: [],
                seguimientos: [],
                soporte: [],
                politicasAtencion: [],
            },
            instrucciones: 'El asistente se encuentra listo para configurar. Carga tus productos y servicios desde el Business Studio.',
        };
        await this.prisma.knowledgeBundle.upsert({
            where: { tenantId },
            update: { systemPrompt: emptyBundlePrompt, version: 1 },
            create: { tenantId, systemPrompt: emptyBundlePrompt, version: 1 },
        });
        this.eventEmitter.emit('knowledge-base.updated', { tenantId });
        return { status: 'CLEAN_SLATE_COMPLETED', tenantId };
    }
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = SettingsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_emitter_1.EventEmitter2])
], SettingsService);
//# sourceMappingURL=settings.service.js.map