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
var OutboundDispatcherService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboundDispatcherService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../../shared/database/prisma.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const waha_adapter_service_1 = require("./waha-adapter.service");
let OutboundDispatcherService = OutboundDispatcherService_1 = class OutboundDispatcherService {
    prisma;
    wahaAdapter;
    eventEmitter;
    logger = new common_1.Logger(OutboundDispatcherService_1.name);
    metrics = {
        pending: 0,
        sent: 0,
        failed: 0,
        retry: 0
    };
    constructor(prisma, wahaAdapter, eventEmitter) {
        this.prisma = prisma;
        this.wahaAdapter = wahaAdapter;
        this.eventEmitter = eventEmitter;
    }
    async processPendingMessages() {
        const nowVET = new Date();
        const hourStr = (() => {
            try {
                return new Intl.DateTimeFormat('en-US', {
                    hour: 'numeric', hour12: false, timeZone: 'America/Caracas'
                }).format(nowVET);
            }
            catch {
                return String(nowVET.getHours());
            }
        })();
        const localHour = parseInt(hourStr, 10);
        if (!isNaN(localHour) && (localHour < 7 || localHour >= 22)) {
            this.logger.debug(`[OutboundDispatcher] Fuera de horario de atención (${localHour}:xx VET). Mensajes pendientes en cola hasta las 7 AM.`);
            return;
        }
        const pendingIds = await this.prisma.pendingOutboundMessage.findMany({
            where: { status: 'PENDING' },
            orderBy: { createdAt: 'asc' },
            take: 5,
            select: { id: true }
        });
        if (!pendingIds.length) {
            return;
        }
        const idsToProcess = pendingIds.map(p => p.id);
        const updatedCount = await this.prisma.pendingOutboundMessage.updateMany({
            where: {
                id: { in: idsToProcess },
                status: 'PENDING'
            },
            data: {
                status: 'PROCESSING'
            }
        });
        if (updatedCount.count === 0) {
            return;
        }
        const messagesToProcess = await this.prisma.pendingOutboundMessage.findMany({
            where: {
                id: { in: idsToProcess },
                status: 'PROCESSING'
            },
            orderBy: { createdAt: 'asc' }
        });
        this.metrics.pending += messagesToProcess.length;
        for (let i = 0; i < messagesToProcess.length; i++) {
            const msg = messagesToProcess[i];
            if (i > 0) {
                const jitterMs = Math.floor(Math.random() * (12000 - 5000 + 1)) + 5000;
                await new Promise(resolve => setTimeout(resolve, jitterMs));
            }
            const startTime = Date.now();
            try {
                const result = await this.wahaAdapter.sendMessage(msg.tenantId, msg.contactId, msg.message);
                const durationMs = Date.now() - startTime;
                await this.prisma.pendingOutboundMessage.update({
                    where: { id: msg.id },
                    data: {
                        status: 'SENT',
                        sentAt: new Date(),
                        durationMs,
                        providerResponse: JSON.stringify({ id: result })
                    }
                });
                if (msg.conversationId) {
                    try {
                        await this.prisma.interaction.create({
                            data: {
                                conversationId: msg.conversationId,
                                direction: 'OUTBOUND',
                                type: 'TEXT',
                                content: msg.message,
                                role: 'assistant',
                            }
                        });
                    }
                    catch (e) {
                        this.logger.warn(`No se pudo guardar interaction para mensaje ${msg.id}: ${e.message}`);
                    }
                }
                this.metrics.sent++;
                this.eventEmitter.emit('OUTBOUND_MESSAGE_SENT', {
                    id: msg.id,
                    tenantId: msg.tenantId,
                    contactId: msg.contactId,
                    durationMs
                });
            }
            catch (error) {
                const durationMs = Date.now() - startTime;
                const newRetries = msg.retries + 1;
                if (newRetries < 3) {
                    await this.prisma.pendingOutboundMessage.update({
                        where: { id: msg.id },
                        data: {
                            status: 'PENDING',
                            retries: newRetries,
                            durationMs,
                            providerResponse: JSON.stringify({ error: error.message })
                        }
                    });
                    this.metrics.retry++;
                }
                else {
                    await this.prisma.pendingOutboundMessage.update({
                        where: { id: msg.id },
                        data: {
                            status: 'FAILED',
                            retries: newRetries,
                            durationMs,
                            providerResponse: JSON.stringify({ error: error.message })
                        }
                    });
                    this.metrics.failed++;
                    this.eventEmitter.emit('OUTBOUND_MESSAGE_FAILED', {
                        id: msg.id,
                        tenantId: msg.tenantId,
                        contactId: msg.contactId,
                        error: error.message
                    });
                }
            }
        }
        this.logger.debug(`Métricas de despacho: SENT=${this.metrics.sent}, FAILED=${this.metrics.failed}, RETRY=${this.metrics.retry}`);
    }
    getMetrics() {
        return { ...this.metrics };
    }
};
exports.OutboundDispatcherService = OutboundDispatcherService;
__decorate([
    (0, schedule_1.Cron)('*/30 * * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OutboundDispatcherService.prototype, "processPendingMessages", null);
exports.OutboundDispatcherService = OutboundDispatcherService = OutboundDispatcherService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        waha_adapter_service_1.WahaAdapterService,
        event_emitter_1.EventEmitter2])
], OutboundDispatcherService);
//# sourceMappingURL=outbound-dispatcher.service.js.map