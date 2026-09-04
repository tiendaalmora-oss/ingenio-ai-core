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
var NodeExecutorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeExecutorService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const runtime_logger_service_1 = require("./runtime-logger.service");
let NodeExecutorService = NodeExecutorService_1 = class NodeExecutorService {
    runtimeLogger;
    eventEmitter;
    logger = new common_1.Logger(NodeExecutorService_1.name);
    constructor(runtimeLogger, eventEmitter) {
        this.runtimeLogger = runtimeLogger;
        this.eventEmitter = eventEmitter;
    }
    async execute(step, context) {
        this.runtimeLogger.logStep(context.tenantId, context.sessionId, step.id, step.type, `Ejecutando: ${step.name}`);
        try {
            switch (step.type) {
                case 'event': return await this.executeEvent(step, context);
                case 'ai': return await this.executeAi(step, context);
                case 'crm': return await this.executeCrm(step, context);
                case 'whatsapp': return await this.executeWhatsapp(step, context);
                case 'skill': return await this.executeSkill(step, context);
                case 'condition': return await this.executeCondition(step, context);
                case 'automation': return await this.executeAutomation(step, context);
                case 'end': return null;
                default: return step.next || null;
            }
        }
        catch (error) {
            this.runtimeLogger.logStep(context.tenantId, context.sessionId, step.id, 'error', `Fallo: ${error.message}`);
            return null;
        }
    }
    async executeEvent(step, context) {
        return step.next || null;
    }
    async executeAi(step, context) {
        const payload = context.triggerEvent;
        const hermesUrl = process.env.HERMES_BASE_URL || 'http://localhost:4000/api/v1/hermes';
        const apiKey = process.env.HERMES_API_KEY || '';
        const model = process.env.HERMES_MODEL || 'hermes';
        try {
            const response = await fetch(`${hermesUrl}/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model,
                    messages: [{ role: 'user', content: payload.content || 'Analizar intención del cliente' }]
                })
            });
            const data = await response.json();
            context.state.aiResponse = data.choices?.[0]?.message?.content || "Análisis completado";
            this.runtimeLogger.logStep(context.tenantId, context.sessionId, step.id, 'ai', `Hermes analizó el contexto.`);
        }
        catch (e) {
            this.runtimeLogger.logStep(context.tenantId, context.sessionId, step.id, 'error', `IA falló. Continúa flujo.`);
        }
        return step.next || null;
    }
    async executeCrm(step, context) {
        this.eventEmitter.emit('contact.update', {
            tenantId: context.tenantId,
            contactId: context.triggerEvent?.contactId || 'unknown',
            data: { leadStatus: 'HOT_LEAD' }
        });
        this.runtimeLogger.logStep(context.tenantId, context.sessionId, step.id, 'crm', `CRM actualizado a HOT_LEAD.`);
        return step.next || null;
    }
    async executeWhatsapp(step, context) {
        const msg = context.state.aiResponse || step.description || "Mensaje por defecto";
        this.eventEmitter.emit('response.generated', {
            tenantId: context.tenantId,
            conversationId: context.sessionId,
            content: msg
        });
        this.runtimeLogger.logStep(context.tenantId, context.sessionId, step.id, 'whatsapp', `Enviando mensaje: ${msg}`);
        return step.next || null;
    }
    async executeSkill(step, context) {
        this.eventEmitter.emit('tool.called', {
            tenantId: context.tenantId,
            conversationId: context.sessionId,
            contactId: context.triggerEvent?.contactId,
            toolCallId: 'skill_123',
            toolName: step.name || 'generic_skill',
            arguments: {}
        });
        this.runtimeLogger.logStep(context.tenantId, context.sessionId, step.id, 'skill', `Skill invocada: ${step.name}`);
        return step.next || null;
    }
    async executeCondition(step, context) {
        const isInterested = (context.state.aiResponse || '').toLowerCase().includes('comprar') || Math.random() > 0.5;
        this.runtimeLogger.logStep(context.tenantId, context.sessionId, step.id, 'condition', `Evaluado como: ${isInterested}`);
        return isInterested ? (step.onTrue || null) : (step.onFalse || null);
    }
    async executeAutomation(step, context) {
        this.runtimeLogger.logStep(context.tenantId, context.sessionId, step.id, 'automation', `Aplicando automatización.`);
        return step.next || null;
    }
};
exports.NodeExecutorService = NodeExecutorService;
exports.NodeExecutorService = NodeExecutorService = NodeExecutorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [runtime_logger_service_1.RuntimeLoggerService,
        event_emitter_1.EventEmitter2])
], NodeExecutorService);
//# sourceMappingURL=node-executor.service.js.map