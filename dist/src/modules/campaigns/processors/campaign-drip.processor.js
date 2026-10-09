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
var CampaignDripProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignDripProcessor = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../../shared/database/prisma.service");
const waha_adapter_service_1 = require("../../outbound-engine/services/waha-adapter.service");
const email_sender_service_1 = require("../services/email-sender.service");
let CampaignDripProcessor = CampaignDripProcessor_1 = class CampaignDripProcessor {
    prisma;
    wahaAdapter;
    emailSender;
    logger = new common_1.Logger(CampaignDripProcessor_1.name);
    isProcessing = false;
    constructor(prisma, wahaAdapter, emailSender) {
        this.prisma = prisma;
        this.wahaAdapter = wahaAdapter;
        this.emailSender = emailSender;
    }
    async handleDripDispatch() {
        if (this.isProcessing)
            return;
        this.isProcessing = true;
        try {
            const runningCampaigns = await this.prisma.campaign.findMany({
                where: { status: 'RUNNING' },
            });
            if (runningCampaigns.length === 0)
                return;
            for (const campaign of runningCampaigns) {
                await this.processSingleCampaign(campaign);
            }
        }
        catch (err) {
            this.logger.error(`[CampaignDrip] Excepción en ciclo de goteo: ${err.message}`);
        }
        finally {
            this.isProcessing = false;
        }
    }
    async processSingleCampaign(campaign) {
        const campaignId = campaign.id;
        const lastSentItem = await this.prisma.campaignItem.findFirst({
            where: { campaignId, status: 'SENT' },
            orderBy: { sentAt: 'desc' },
            select: { sentAt: true },
        });
        if (lastSentItem && lastSentItem.sentAt) {
            const baseIntervalMs = (campaign.dripIntervalSeconds || 30) * 1000;
            const randomJitterMs = Math.floor(Math.random() * 7000) - 3000;
            const effectiveDelayMs = Math.max(15000, baseIntervalMs + randomJitterMs);
            const elapsedMs = Date.now() - new Date(lastSentItem.sentAt).getTime();
            if (elapsedMs < effectiveDelayMs) {
                return;
            }
        }
        const item = await this.prisma.campaignItem.findFirst({
            where: { campaignId, status: 'PENDING' },
            include: {
                contact: {
                    include: {
                        conversations: {
                            orderBy: { id: 'desc' },
                            take: 1,
                        },
                        memory: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });
        if (!item) {
            await this.prisma.campaign.update({
                where: { id: campaignId },
                data: { status: 'COMPLETED' },
            });
            this.logger.log(`[CampaignDrip] ¡Campaña "${campaign.name}" completada al 100%!`);
            return;
        }
        await this.prisma.campaignItem.update({
            where: { id: item.id },
            data: { status: 'SENDING' },
        });
        const tenantId = campaign.tenantId;
        const phone = item.recipientPhone || item.contact?.phone || item.contact?.externalId;
        const content = item.renderedMessage || campaign.messageTemplate;
        try {
            if (campaign.channel === 'WHATSAPP' || campaign.channel === 'BOTH') {
                if (!phone) {
                    throw new Error('El contacto no posee número de teléfono registrado');
                }
                await this.wahaAdapter.startTyping(tenantId, phone).catch(() => { });
                await new Promise((r) => setTimeout(r, 2500));
                if (campaign.mediaUrl) {
                    await this.wahaAdapter.sendFile(tenantId, phone, campaign.mediaUrl, content, campaign.mediaFilename, campaign.mediaType === 'IMAGE' ? 'image/jpeg' : 'application/pdf');
                }
                else {
                    await this.wahaAdapter.sendMessage(tenantId, phone, content);
                }
                let convId = item.contact?.conversations?.[0]?.id;
                if (!convId) {
                    const newConv = await this.prisma.conversation.create({
                        data: {
                            contactId: item.contactId,
                            status: 'RESOLVED',
                        },
                    });
                    convId = newConv.id;
                }
                await this.prisma.interaction.create({
                    data: {
                        conversationId: convId,
                        direction: 'OUTBOUND',
                        type: campaign.mediaUrl ? 'IMAGE' : 'TEXT',
                        role: 'assistant',
                        content,
                        timestamp: new Date(),
                    },
                });
                const campaignTag = `CAMPANA_${campaign.name
                    .toUpperCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^A-Z0-9]/g, '_')
                    .slice(0, 24)}`;
                const existingTags = item.contact?.memory?.tags || [];
                const updatedTags = Array.from(new Set([...existingTags, campaignTag]));
                await this.prisma.businessMemory.upsert({
                    where: { contactId: item.contactId },
                    update: {
                        lastInteraction: new Date(),
                        tags: updatedTags,
                    },
                    create: {
                        contactId: item.contactId,
                        lastInteraction: new Date(),
                        tags: updatedTags,
                    },
                });
            }
            if (campaign.channel === 'EMAIL' || campaign.channel === 'BOTH') {
                const email = item.recipientEmail || item.contact?.memory?.company;
                if (email && email.includes('@')) {
                    await this.emailSender.sendEmail({
                        to: email,
                        subject: campaign.subject || `Novedad de ${campaign.name}`,
                        text: content,
                    });
                }
            }
            await this.prisma.campaignItem.update({
                where: { id: item.id },
                data: {
                    status: 'SENT',
                    sentAt: new Date(),
                },
            });
            await this.prisma.campaign.update({
                where: { id: campaignId },
                data: {
                    sentCount: { increment: 1 },
                },
            });
            this.logger.log(`[CampaignDrip] Mensaje entregado con éxito a ${item.recipientName || phone} (${campaign.name})`);
        }
        catch (sendErr) {
            this.logger.error(`[CampaignDrip] Falló entrega a ${phone || item.id}: ${sendErr.message}`);
            await this.prisma.campaignItem.update({
                where: { id: item.id },
                data: {
                    status: 'FAILED',
                    errorMessage: sendErr.message || 'Error de entrega en proveedor',
                },
            });
            await this.prisma.campaign.update({
                where: { id: campaignId },
                data: {
                    failedCount: { increment: 1 },
                },
            });
        }
    }
};
exports.CampaignDripProcessor = CampaignDripProcessor;
__decorate([
    (0, schedule_1.Interval)(4000),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CampaignDripProcessor.prototype, "handleDripDispatch", null);
exports.CampaignDripProcessor = CampaignDripProcessor = CampaignDripProcessor_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        waha_adapter_service_1.WahaAdapterService,
        email_sender_service_1.EmailSenderService])
], CampaignDripProcessor);
//# sourceMappingURL=campaign-drip.processor.js.map