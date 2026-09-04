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
var MetaWebhookController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaWebhookController = void 0;
const common_1 = require("@nestjs/common");
const receive_message_service_1 = require("./receive-message.service");
const tenant_resolver_service_1 = require("../../tenant/services/tenant-resolver.service");
const prisma_service_1 = require("../../../shared/database/prisma.service");
const audio_transcription_service_1 = require("../../media-processing/services/audio-transcription.service");
const media_vision_service_1 = require("../../media-processing/services/media-vision.service");
let MetaWebhookController = MetaWebhookController_1 = class MetaWebhookController {
    receiveMessageService;
    tenantResolver;
    prisma;
    audioTranscriptionService;
    mediaVisionService;
    logger = new common_1.Logger(MetaWebhookController_1.name);
    constructor(receiveMessageService, tenantResolver, prisma, audioTranscriptionService, mediaVisionService) {
        this.receiveMessageService = receiveMessageService;
        this.tenantResolver = tenantResolver;
        this.prisma = prisma;
        this.audioTranscriptionService = audioTranscriptionService;
        this.mediaVisionService = mediaVisionService;
    }
    verifyToken(query, res) {
        const mode = query['hub.mode'];
        const token = query['hub.verify_token'];
        const challenge = query['hub.challenge'];
        const expectedToken = process.env.META_VERIFY_TOKEN || 'ingenio_meta_secret';
        if (mode === 'subscribe' && (token === expectedToken || !token)) {
            this.logger.log('Meta Webhook verified successfully!');
            return res.status(common_1.HttpStatus.OK).send(challenge);
        }
        return res.status(common_1.HttpStatus.FORBIDDEN).send('Forbidden');
    }
    async receiveMessage(body, res) {
        this.logger.debug(`Webhook received: event=${body?.event || body?.object} session=${body?.session}`);
        res.status(common_1.HttpStatus.OK).send('EVENT_RECEIVED');
        try {
            let tenantId = '';
            let contactId = '';
            let content = '';
            let pushName = undefined;
            if (body.event === 'message' || body.event === 'message.any') {
                const payload = body.payload || {};
                const isFromMe = Boolean(payload.fromMe);
                if (isFromMe) {
                    if (body.event === 'message.any')
                        return;
                    tenantId = await this.tenantResolver.resolveFromWahaSession(body.session || 'default');
                    if (!tenantId)
                        return;
                    const toRaw = (payload.to || '').replace(/:\d+@/, '@');
                    if (!toRaw || toRaw.endsWith('@g.us'))
                        return;
                    const toDigits = toRaw.replace(/@(c\.us|lid|s\.whatsapp\.net)$/, '').replace(/\D/g, '');
                    const manualText = payload.body || payload.caption || '';
                    if (manualText && toDigits) {
                        this.logger.log(`[Mobile Sync] Msg saliente manual para ${toRaw}: "${manualText.substring(0, 40)}..."`);
                        const existingContact = await this.prisma.contact.findFirst({
                            where: {
                                tenantId,
                                OR: [
                                    { externalId: toRaw },
                                    { phone: toDigits },
                                    { phoneNormalized: toDigits },
                                ]
                            }
                        });
                        if (existingContact) {
                            const conv = await this.prisma.conversation.findFirst({
                                where: { contactId: existingContact.id }
                            });
                            if (conv) {
                                await this.prisma.interaction.create({
                                    data: {
                                        conversationId: conv.id,
                                        direction: 'OUTBOUND',
                                        type: 'TEXT',
                                        content: manualText,
                                        role: 'assistant',
                                    }
                                });
                                await this.prisma.conversation.update({
                                    where: { id: conv.id },
                                    data: { status: 'HANDOFF' }
                                });
                                await this.prisma.pendingOutboundMessage.deleteMany({
                                    where: { conversationId: conv.id }
                                });
                                this.logger.log(`[Mobile Sync] Conversación ${conv.id} sincronizada y pausada en HANDOFF.`);
                            }
                        }
                    }
                    return;
                }
                if (body.event === 'message.any')
                    return;
                contactId = (payload.from || '').replace(/:\d+@/, '@');
                if (!contactId || contactId.endsWith('@g.us')) {
                    this.logger.debug(`Ignoring group or empty contactId: ${contactId}`);
                    return;
                }
                tenantId = await this.tenantResolver.resolveFromWahaSession(body.session || 'default');
                if (body.session && tenantId) {
                    try {
                        await this.prisma.tenant.update({
                            where: { id: tenantId },
                            data: { wahaSession: body.session }
                        });
                    }
                    catch { }
                }
                pushName = payload.notifyName || payload._data?.notifyName || payload.pushName || payload._data?.pushName;
                const hasMedia = payload.hasMedia || Boolean(payload.media);
                const media = payload.media || {};
                const mimetype = (media.mimetype || payload._data?.mimetype || '').toLowerCase();
                const messageType = (payload.type || '').toLowerCase();
                if (hasMedia && (mimetype.startsWith('audio/') || messageType === 'ptt' || messageType === 'audio')) {
                    this.logger.log(`Procesando nota de voz entrante de ${contactId}...`);
                    content = await this.audioTranscriptionService.transcribe(media);
                }
                else if (hasMedia && (mimetype.startsWith('image/') || messageType === 'image')) {
                    this.logger.log(`Procesando imagen entrante de ${contactId}...`);
                    const caption = payload.body || payload.caption || '';
                    content = await this.mediaVisionService.analyzeImage(media, caption);
                }
                else {
                    content = payload.body || '';
                }
            }
            else if (body.object === 'page' || body.object === 'instagram') {
                const entry = body.entry?.[0];
                const messaging = entry?.messaging?.[0];
                if (!messaging || !messaging.message || messaging.message.is_echo) {
                    this.logger.debug('Ignoring non-message or echo event from Meta');
                    return;
                }
                const isInstagram = body.object === 'instagram' || String(entry?.id || '').startsWith('ig_');
                const prefix = isInstagram ? 'ig_' : 'fb_';
                contactId = `${prefix}${messaging.sender?.id}`;
                const defaultTenant = await this.prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
                tenantId = defaultTenant?.id || 'dba1c54c-89c6-41e9-ae9d-03613377a5b3';
                const attachment = messaging.message?.attachments?.[0];
                if (attachment?.type === 'audio') {
                    content = await this.audioTranscriptionService.transcribe({ url: attachment.payload?.url });
                }
                else if (attachment?.type === 'image') {
                    content = await this.mediaVisionService.analyzeImage({ url: attachment.payload?.url }, messaging.message?.text);
                }
                else {
                    content = messaging.message?.text;
                }
            }
            else {
                contactId = body.contactId || 'contact-demo-123';
                content = body.content || 'Mensaje de prueba';
                const defaultTenant = await this.prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
                tenantId = defaultTenant?.id || 'dba1c54c-89c6-41e9-ae9d-03613377a5b3';
            }
            if (!contactId || !content) {
                this.logger.warn('Ignoring webhook event: missing contactId or content');
                return;
            }
            await this.receiveMessageService.execute(tenantId, contactId, content, pushName);
        }
        catch (error) {
            this.logger.error('Error processing Meta Webhook in background:', error.message);
            try {
                await this.prisma.incomingMessageFailure.create({
                    data: {
                        payload: body,
                        error: error.message || 'Unknown error'
                    }
                });
            }
            catch (dbError) {
                this.logger.error('Failed to persist IncomingMessageFailure:', dbError.message);
            }
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
exports.MetaWebhookController = MetaWebhookController = MetaWebhookController_1 = __decorate([
    (0, common_1.Controller)('webhooks/meta'),
    __metadata("design:paramtypes", [receive_message_service_1.ReceiveMessageService,
        tenant_resolver_service_1.TenantResolverService,
        prisma_service_1.PrismaService,
        audio_transcription_service_1.AudioTranscriptionService,
        media_vision_service_1.MediaVisionService])
], MetaWebhookController);
//# sourceMappingURL=meta-webhook.controller.js.map