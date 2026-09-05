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
var LlmListenerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LlmListenerService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const event_emitter_2 = require("@nestjs/event-emitter");
const context_builder_service_1 = require("./context-builder.service");
const hermes_client_service_1 = require("./hermes-client.service");
const conversation_1 = require("../../conversation");
const response_generated_event_1 = require("../events/out/response-generated.event");
const tool_called_event_1 = require("../events/out/tool-called.event");
const prisma_service_1 = require("../../../shared/database/prisma.service");
const funnel_engine_service_1 = require("../../funnel-engine/funnel-engine.service");
const runtime_engine_service_1 = require("../../funnel-engine/runtime/runtime-engine.service");
const response_sanitizer_1 = require("../utils/response-sanitizer");
let LlmListenerService = LlmListenerService_1 = class LlmListenerService {
    contextBuilder;
    hermesClient;
    eventEmitter;
    prisma;
    funnelEngine;
    runtimeEngine;
    logger = new common_1.Logger(LlmListenerService_1.name);
    loopDepths = new Map();
    MAX_LOOP_DEPTH = 5;
    LOOP_RESET_MS = 30_000;
    constructor(contextBuilder, hermesClient, eventEmitter, prisma, funnelEngine, runtimeEngine) {
        this.contextBuilder = contextBuilder;
        this.hermesClient = hermesClient;
        this.eventEmitter = eventEmitter;
        this.prisma = prisma;
        this.funnelEngine = funnelEngine;
        this.runtimeEngine = runtimeEngine;
    }
    async handleInteraction(payload) {
        this.logger.log(`Executive Loop atrapó interacción entrante (Conv: ${payload.conversationId})`);
        if (!this.canEnterLoop(payload.conversationId)) {
            this.logger.warn(`[CircuitBreaker] ABORT — Executive Loop depth exceeded MAX_LOOP_DEPTH (${this.MAX_LOOP_DEPTH}) ` +
                `for conversation ${payload.conversationId}. ` +
                `Dropping interaction to prevent infinite recursion.`);
            return;
        }
        const bundle = this.prisma?.knowledgeBundle
            ? await this.prisma.knowledgeBundle.findUnique({
                where: { tenantId: payload.tenantId },
            })
            : null;
        const rawPrompt = bundle?.systemPrompt || {};
        const rawData = rawPrompt['_raw'] || rawPrompt;
        const reglasBot = rawData.reglasBot || {
            autoPauseOptOut: true,
            optOutMessage: 'Entendido perfectamente. Agradecemos mucho tu tiempo y honestidad. ¡Que tengas un excelente día!',
            autoPauseHandoff: true,
            handoffMessage: 'Con gusto. En breve un asesor humano de nuestro equipo continuará la conversación contigo por acá.',
            enableMessageLimit: true,
            maxBotMessages: 10,
            respondLastMessageBeforePause: true,
            autoResetAfterTime: false,
            resetHours: 24,
            limitReachedMessage: ''
        };
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: payload.conversationId },
        });
        if (conversation && (conversation.status === 'HANDOFF' || conversation.status === 'PAUSED' || conversation.status === 'LOST' || conversation.status === 'RESOLVED')) {
            if (reglasBot.autoResetAfterTime && (conversation.status === 'HANDOFF' || conversation.status === 'PAUSED')) {
                const resetHours = Number(reglasBot.resetHours) || 24;
                const resetMs = resetHours * 3600 * 1000;
                const lastInteraction = this.prisma?.interaction?.findFirst
                    ? await this.prisma.interaction.findFirst({
                        where: { conversationId: payload.conversationId },
                        orderBy: { timestamp: 'desc' }
                    })
                    : null;
                const lastUpdated = lastInteraction?.timestamp ? new Date(lastInteraction.timestamp).getTime() : 0;
                const elapsed = Date.now() - lastUpdated;
                if (elapsed >= resetMs) {
                    this.logger.log(`[Reglas Bot] Han transcurrido ${(elapsed / 3600000).toFixed(1)}h (límite: ${resetHours}h). Reactivando bot automáticamente para conversación ${payload.conversationId}.`);
                    await this.prisma.conversation.update({
                        where: { id: payload.conversationId },
                        data: { status: 'ACTIVE' }
                    });
                }
                else {
                    this.logger.log(`[Executive Loop] Conversación ${payload.conversationId} en estado '${conversation.status}' (tiempo restante para reset: ${((resetMs - elapsed) / 3600000).toFixed(1)}h). Bot en pausa.`);
                    return;
                }
            }
            else {
                this.logger.log(`[Executive Loop] Conversación ${payload.conversationId} en estado '${conversation.status}'. Bot en pausa para permitir atención humana manual.`);
                return;
            }
        }
        const textNorm = (payload.content || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        if (reglasBot.autoPauseOptOut !== false) {
            const optOutPatterns = [
                'no me interesa',
                'no estoy interesado',
                'no estoy interesada',
                'no gracias',
                'no me escribas mas',
                'no me escriban mas',
                'no me escribas',
                'no me escriban',
                'no quiero nada',
                'no quiero recibir',
                'deja de escribir',
                'dejen de escribir',
                'cancela',
                'cancelar',
                'eliminarme',
                'darme de baja',
                'ya no quiero',
                'no molesten',
                'no molestar',
                'no enviar mas',
                'no me mandes mas',
                'no me manden mas',
                'desuscribir',
                'no responder mas'
            ];
            const isOptOut = optOutPatterns.some(p => textNorm.includes(p));
            if (isOptOut) {
                this.logger.log(`[Reglas Bot] Detectado Opt-Out ("${payload.content}"). Pausando bot permanentemente y cancelando seguimientos.`);
                await this.prisma.conversation.update({
                    where: { id: payload.conversationId },
                    data: { status: 'LOST' }
                });
                const memory = await this.prisma.businessMemory.findUnique({ where: { contactId: payload.contactId } });
                const currentTags = memory?.tags || [];
                const updatedTags = Array.from(new Set([...currentTags, 'NO_INTERESADO', 'OPT_OUT']));
                await this.prisma.businessMemory.upsert({
                    where: { contactId: payload.contactId },
                    create: {
                        contactId: payload.contactId,
                        leadStatus: 'LOST',
                        tags: updatedTags
                    },
                    update: {
                        leadStatus: 'LOST',
                        tags: updatedTags
                    }
                });
                await this.prisma.pendingOutboundMessage.deleteMany({
                    where: { conversationId: payload.conversationId }
                });
                const farewell = reglasBot.optOutMessage || 'Entendido perfectamente. Agradecemos mucho tu tiempo y honestidad. ¡Que tengas un excelente día!';
                await this.prisma.interaction.create({
                    data: {
                        conversationId: payload.conversationId,
                        direction: 'OUTBOUND',
                        type: 'TEXT',
                        content: farewell,
                        role: 'assistant'
                    }
                });
                this.eventEmitter.emit('response.generated', new response_generated_event_1.ResponseGeneratedEvent(payload.tenantId, payload.conversationId, farewell));
                return;
            }
        }
        if (reglasBot.autoPauseHandoff !== false) {
            const handoffPatterns = [
                'hablar con un humano',
                'hablar con una persona',
                'persona real',
                'un asesor',
                'asesor humano',
                'atencion humana',
                'atencion con persona',
                'pasame con un asesor',
                'pasame con alguien',
                'quiero una persona',
                'quiero un asesor',
                'quiero un humano',
                'comunicarme con una persona',
                'comunicarme con un asesor',
                'asesor por favor',
                'humano por favor'
            ];
            const isHandoff = handoffPatterns.some(p => textNorm.includes(p));
            if (isHandoff) {
                this.logger.log(`[Reglas Bot] Solicitud de asesor humano ("${payload.content}"). Traspasando a HANDOFF y cancelando seguimientos.`);
                await this.prisma.conversation.update({
                    where: { id: payload.conversationId },
                    data: { status: 'HANDOFF' }
                });
                const memory = await this.prisma.businessMemory.findUnique({ where: { contactId: payload.contactId } });
                const currentTags = memory?.tags || [];
                const updatedTags = Array.from(new Set([...currentTags, 'HANDOFF_HUMANO', 'ASESOR_SOLICITADO']));
                await this.prisma.businessMemory.upsert({
                    where: { contactId: payload.contactId },
                    create: {
                        contactId: payload.contactId,
                        leadStatus: 'HANDOFF',
                        tags: updatedTags
                    },
                    update: {
                        leadStatus: 'HANDOFF',
                        tags: updatedTags
                    }
                });
                await this.prisma.pendingOutboundMessage.deleteMany({
                    where: { conversationId: payload.conversationId }
                });
                const handoffMsg = reglasBot.handoffMessage || 'Con gusto. En breve un asesor humano de nuestro equipo continuará la conversación contigo por acá.';
                await this.prisma.interaction.create({
                    data: {
                        conversationId: payload.conversationId,
                        direction: 'OUTBOUND',
                        type: 'TEXT',
                        content: handoffMsg,
                        role: 'assistant'
                    }
                });
                this.eventEmitter.emit('response.generated', new response_generated_event_1.ResponseGeneratedEvent(payload.tenantId, payload.conversationId, handoffMsg));
                return;
            }
        }
        if (reglasBot.enableMessageLimit !== false) {
            const maxMessages = Number(reglasBot.maxBotMessages) || 10;
            const botMessageCount = this.prisma?.interaction?.count
                ? await this.prisma.interaction.count({
                    where: {
                        conversationId: payload.conversationId,
                        direction: 'OUTBOUND',
                        role: 'assistant'
                    }
                })
                : 0;
            if (botMessageCount >= maxMessages) {
                this.logger.log(`[Reglas Bot] Conversación ${payload.conversationId} ya alcanzó el límite de ${maxMessages} mensajes del bot (${botMessageCount} enviados). Pausando bot silenciosamente.`);
                await this.prisma.conversation.update({
                    where: { id: payload.conversationId },
                    data: { status: 'HANDOFF' }
                });
                await this.prisma.pendingOutboundMessage.deleteMany({
                    where: { conversationId: payload.conversationId }
                });
                const limitMsg = (reglasBot.limitReachedMessage || '').trim();
                if (limitMsg) {
                    await this.prisma.interaction.create({
                        data: {
                            conversationId: payload.conversationId,
                            direction: 'OUTBOUND',
                            type: 'TEXT',
                            content: limitMsg,
                            role: 'assistant'
                        }
                    });
                    this.eventEmitter.emit('response.generated', new response_generated_event_1.ResponseGeneratedEvent(payload.tenantId, payload.conversationId, limitMsg));
                }
                return;
            }
        }
        try {
            const memory = await this.prisma.businessMemory.findUnique({ where: { contactId: payload.contactId } });
            const currentStatus = memory?.leadStatus || 'COLD';
            let nextStatus = currentStatus;
            const currentTags = memory?.tags || [];
            const newTags = new Set(currentTags);
            const hasImageVoucher = (payload.content || '').includes('[Comprobante de Pago');
            const isExplicitPaymentProof = textNorm.includes('ya transferi') ||
                textNorm.includes('ya pague') ||
                textNorm.includes('ya realice el pago') ||
                textNorm.includes('listo el pago') ||
                textNorm.includes('pago listo') ||
                textNorm.includes('te envie el pago') ||
                textNorm.includes('aqui esta el capture') ||
                textNorm.includes('aqui esta el comprobante') ||
                textNorm.includes('adjunto el capture') ||
                textNorm.includes('adjunto el comprobante') ||
                textNorm.includes('adjunto capture') ||
                textNorm.includes('adjunto comprobante') ||
                /(ref|referencia|nro comprobante|operacion)[\s#:]*\d{4,}/i.test(textNorm);
            const isQuestionOrInquiry = textNorm.includes('?') ||
                textNorm.includes('donde') ||
                textNorm.includes('como') ||
                textNorm.includes('cuando') ||
                textNorm.includes('si pago') ||
                textNorm.includes('para pagar') ||
                textNorm.includes('puedo pagar') ||
                textNorm.includes('cuanto tarda');
            const isPaymentMsg = hasImageVoucher || (isExplicitPaymentProof && !isQuestionOrInquiry);
            const isHotMsg = textNorm.includes('precio') || textNorm.includes('costo') || textNorm.includes('cuanto vale') || textNorm.includes('como pago') || textNorm.includes('datos de pago') || textNorm.includes('pago movil') || textNorm.includes('transferencia') || textNorm.includes('quiero comprar') || textNorm.includes('comprar') || textNorm.includes('cuenta');
            const isWarmMsg = textNorm.includes('me interesa') || textNorm.includes('informacion') || textNorm.includes('tienen de') || textNorm.includes('kit') || textNorm.includes('docente') || textNorm.includes('profesor') || textNorm.includes('para que ano') || textNorm.includes('bachillerato') || textNorm.includes('primaria');
            if (isPaymentMsg && reglasBot.autoPausePayment !== false) {
                this.logger.log(`[Reglas Bot / Pagos] Detectado comprobante de pago ("${payload.content}"). Pausando bot permanentemente para atención humana y entrega.`);
                await this.prisma.conversation.update({
                    where: { id: payload.conversationId },
                    data: { status: 'HANDOFF' }
                });
                newTags.add('PAGO_CONFIRMADO');
                newTags.add('COMPROBANTE_RECIBIDO');
                await this.prisma.businessMemory.upsert({
                    where: { contactId: payload.contactId },
                    create: {
                        contactId: payload.contactId,
                        leadStatus: 'CLOSED',
                        tags: Array.from(newTags),
                    },
                    update: {
                        leadStatus: 'CLOSED',
                        tags: Array.from(newTags),
                    }
                });
                await this.prisma.pendingOutboundMessage.deleteMany({
                    where: { conversationId: payload.conversationId }
                });
                const paymentAckMsg = (reglasBot.paymentReceivedMessage || '').trim() ||
                    '¡Muchas gracias! 🎉 Hemos recibido tu comprobante de pago. En breve un asesor de nuestro equipo verificará los datos de la transferencia y te entregará el acceso a tu material por este medio. ¡Quedamos a tu completa orden!';
                await this.prisma.interaction.create({
                    data: {
                        conversationId: payload.conversationId,
                        direction: 'OUTBOUND',
                        type: 'TEXT',
                        content: paymentAckMsg,
                        role: 'assistant'
                    }
                });
                this.eventEmitter.emit('response.generated', new response_generated_event_1.ResponseGeneratedEvent(payload.tenantId, payload.conversationId, paymentAckMsg));
                return;
            }
            else if (isPaymentMsg) {
                nextStatus = 'CLOSED';
                newTags.add('PAGO_CONFIRMADO');
                newTags.add('COMPROBANTE_RECIBIDO');
            }
            else if (isHotMsg && currentStatus !== 'CLOSED') {
                nextStatus = 'HOT';
                newTags.add('PIDIO_PRECIO');
                newTags.add('ALTO_INTERES');
            }
            else if (isWarmMsg && currentStatus === 'COLD') {
                nextStatus = 'WARM';
                newTags.add('INTERESADO');
            }
            if (nextStatus !== currentStatus || newTags.size !== currentTags.length) {
                await this.prisma.businessMemory.upsert({
                    where: { contactId: payload.contactId },
                    create: {
                        contactId: payload.contactId,
                        leadStatus: nextStatus,
                        tags: Array.from(newTags),
                    },
                    update: {
                        leadStatus: nextStatus,
                        tags: Array.from(newTags),
                    }
                });
                this.logger.log(`[CRM Auto-Pipeline] Lead ${payload.contactId} actualizado de "${currentStatus}" a "${nextStatus}" (Tags: ${Array.from(newTags).join(', ')})`);
            }
        }
        catch (err) {
            this.logger.warn(`Error en auto-asignación de temperatura CRM: ${err.message}`);
        }
        this.incrementDepth(payload.conversationId);
        try {
            const funnel = await this.funnelEngine.findMatchingFunnel(payload);
            if (funnel) {
                this.logger.log(`Ejecutando Automation Runtime para el funnel: ${funnel.name}`);
                const dsl = this.runtimeEngine.parseReactFlowToDsl(funnel.steps);
                const context = {
                    tenantId: payload.tenantId,
                    sessionId: payload.conversationId,
                    triggerEvent: payload,
                    state: {},
                    logs: []
                };
                await this.runtimeEngine.executeFlow(dsl, context);
                return;
            }
            this.logger.log(`No hay automatización, ejecutando Agente Universal...`);
            const masterPrompt = await this.contextBuilder.buildContext(payload.tenantId, payload.contactId, payload.conversationId, payload.content, null);
            let finalContent = '';
            const response = await this.hermesClient.generateResponse(masterPrompt, true);
            if (response.toolCalls && response.toolCalls.length > 0) {
                await this.prisma.interaction.create({
                    data: {
                        conversationId: payload.conversationId,
                        direction: 'OUTBOUND',
                        type: 'TOOL_CALL',
                        content: response.content || '',
                        role: 'assistant',
                        toolCalls: response.toolCalls
                    }
                });
                for (const call of response.toolCalls) {
                    await this.eventEmitter.emitAsync('tool.called', new tool_called_event_1.ToolCalledEvent(payload.tenantId, payload.conversationId, payload.contactId, call.id, call.name, call.arguments));
                }
                if (response.content && response.content.trim() !== '') {
                    finalContent = response.content;
                }
                else {
                    this.logger.log(`[Executive Loop] Herramienta ejecutada. Solicitando respuesta de texto conversacional para el usuario...`);
                    const textPrompt = await this.contextBuilder.buildContext(payload.tenantId, payload.contactId, payload.conversationId, payload.content, null);
                    textPrompt.push({
                        role: 'user',
                        content: `[SISTEMA]: La memoria del CRM ya fue actualizada con éxito. Redacta ahora tu respuesta conversacional completa para el usuario respondiendo a su mensaje: "${payload.content}". Sé persuasivo, amable y termina con una pregunta de cierre.`
                    });
                    const textResponse = await this.hermesClient.generateResponse(textPrompt, false);
                    if (textResponse.content) {
                        finalContent = textResponse.content;
                    }
                }
            }
            else if (response.content) {
                finalContent = response.content;
            }
            if (finalContent) {
                const lower = finalContent.toLowerCase();
                if (lower.includes('hermes no pudo') || lower.includes('error calling') || lower.includes('failed to process')) {
                    this.logger.warn(`[Executive Loop Shield] Detectado mensaje de error técnico. Reemplazando por saludo de contingencia.`);
                    finalContent = '';
                }
            }
            if (!finalContent || finalContent.trim() === '') {
                this.logger.warn(`[Executive Loop] LLM no generó texto válido. Generando saludo cordial de contingencia...`);
                finalContent = '¡Hola! Qué gusto saludarte. 👋 ¿En qué podemos ayudarte el día de hoy?';
            }
            if (finalContent) {
                finalContent = (0, response_sanitizer_1.sanitizeUserFacingResponse)(finalContent);
                const hasDownloadLink = /(?:https?:\/\/)?(?:docs\.google\.com|drive\.google\.com|mega\.nz|dropbox\.com)\/[^\s]+/i.test(finalContent);
                if (hasDownloadLink) {
                    const memory = await this.prisma.businessMemory.findUnique({ where: { contactId: payload.contactId } });
                    const isPaid = memory?.leadStatus === 'CLOSED' || (Array.isArray(memory?.tags) && memory.tags.includes('PAGO_CONFIRMADO'));
                    if (!isPaid) {
                        this.logger.warn(`[Shield] Bloqueada fuga de enlace de producto/descarga para contacto no verificado (${payload.contactId})`);
                        finalContent = finalContent
                            .replace(/(?:https?:\/\/)?(?:docs\.google\.com|drive\.google\.com|mega\.nz|dropbox\.com)\/[^\s]+/gi, '')
                            .replace(/docs\.google\.com/gi, '')
                            .trim();
                        if (!finalContent || finalContent.length < 10) {
                            finalContent = '¡Con gusto, profe! Todo el material viene en formato digital (Word y PDF). En cuanto nos compartas tu comprobante de pago o número de referencia, te entregamos de inmediato el enlace de acceso completo. 😊';
                        }
                    }
                }
            }
            if (finalContent && finalContent.trim() !== '') {
                await this.prisma.interaction.create({
                    data: {
                        conversationId: payload.conversationId,
                        direction: 'OUTBOUND',
                        type: 'TEXT',
                        content: finalContent,
                        role: 'assistant'
                    }
                });
                this.eventEmitter.emit('response.generated', new response_generated_event_1.ResponseGeneratedEvent(payload.tenantId, payload.conversationId, finalContent));
                if (reglasBot.enableMessageLimit !== false) {
                    const maxMessages = Number(reglasBot.maxBotMessages) || 10;
                    const currentCount = this.prisma?.interaction?.count
                        ? await this.prisma.interaction.count({
                            where: {
                                conversationId: payload.conversationId,
                                direction: 'OUTBOUND',
                                role: 'assistant'
                            }
                        })
                        : 0;
                    if (currentCount >= maxMessages) {
                        this.logger.log(`[Reglas Bot] Conversación ${payload.conversationId} completó su respuesta #${currentCount} (límite: ${maxMessages}). Pausando bot silenciosamente para futuros mensajes.`);
                        await this.prisma.conversation.update({
                            where: { id: payload.conversationId },
                            data: { status: 'HANDOFF' }
                        });
                        await this.prisma.pendingOutboundMessage.deleteMany({
                            where: { conversationId: payload.conversationId }
                        });
                    }
                }
            }
        }
        catch (error) {
            this.logger.error(`Error orquestando LLM:`, error);
        }
        finally {
            this.decrementDepth(payload.conversationId);
        }
    }
    canEnterLoop(conversationId) {
        this.pruneStaleEntries();
        const state = this.loopDepths.get(conversationId);
        if (!state)
            return true;
        return state.depth < this.MAX_LOOP_DEPTH;
    }
    incrementDepth(conversationId) {
        const existing = this.loopDepths.get(conversationId);
        const newDepth = (existing?.depth ?? 0) + 1;
        this.loopDepths.set(conversationId, {
            depth: newDepth,
            resetAt: Date.now() + this.LOOP_RESET_MS,
        });
        this.logger.debug(`[CircuitBreaker] Conv ${conversationId}: depth → ${newDepth}`);
    }
    decrementDepth(conversationId) {
        const state = this.loopDepths.get(conversationId);
        if (!state)
            return;
        const newDepth = state.depth - 1;
        if (newDepth <= 0) {
            this.loopDepths.delete(conversationId);
        }
        else {
            this.loopDepths.set(conversationId, { ...state, depth: newDepth });
        }
        this.logger.debug(`[CircuitBreaker] Conv ${conversationId}: depth → ${Math.max(0, newDepth)}`);
    }
    pruneStaleEntries() {
        const now = Date.now();
        for (const [id, state] of this.loopDepths.entries()) {
            if (state.resetAt <= now) {
                this.loopDepths.delete(id);
                this.logger.debug(`[CircuitBreaker] Pruned stale entry for conv ${id}`);
            }
        }
    }
    getLoopDepth(conversationId) {
        return this.loopDepths.get(conversationId)?.depth ?? 0;
    }
};
exports.LlmListenerService = LlmListenerService;
__decorate([
    (0, event_emitter_1.OnEvent)('interaction.received', { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [conversation_1.InteractionReceivedEvent]),
    __metadata("design:returntype", Promise)
], LlmListenerService.prototype, "handleInteraction", null);
exports.LlmListenerService = LlmListenerService = LlmListenerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [context_builder_service_1.ContextBuilderService,
        hermes_client_service_1.HermesClientService,
        event_emitter_2.EventEmitter2,
        prisma_service_1.PrismaService,
        funnel_engine_service_1.FunnelEngineService,
        runtime_engine_service_1.RuntimeEngineService])
], LlmListenerService);
//# sourceMappingURL=llm-listener.service.js.map