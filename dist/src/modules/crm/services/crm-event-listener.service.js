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
var CrmEventListenerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrmEventListenerService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../../../shared/database/prisma.service");
let CrmEventListenerService = CrmEventListenerService_1 = class CrmEventListenerService {
    prisma;
    logger = new common_1.Logger(CrmEventListenerService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async handleMemoryUpdated(payload) {
        this.logger.log(`[CRM] Actualizando Business Memory para Contacto: ${payload.contactId}`);
        try {
            const updates = payload.updates;
            await this.prisma.businessMemory.upsert({
                where: { contactId: payload.contactId },
                update: {
                    name: updates.name,
                    company: updates.company,
                    interests: updates.interests,
                    objections: updates.objections,
                    leadStatus: updates.leadStatus,
                    tags: updates.tags,
                },
                create: {
                    contactId: payload.contactId,
                    name: updates.name,
                    company: updates.company,
                    interests: updates.interests || [],
                    objections: updates.objections || [],
                    leadStatus: updates.leadStatus,
                    tags: updates.tags || [],
                },
            });
            if (updates.name) {
                await this.prisma.contact.update({
                    where: { id: payload.contactId },
                    data: { name: updates.name }
                });
            }
        }
        catch (error) {
            this.logger.error('[CRM] Falló actualización de Business Memory:', error);
        }
    }
    async handleTaskCreated(payload) {
        this.logger.log(`[CRM] Creando Task para Contacto: ${payload.contactId}`);
        try {
            await this.prisma.task.create({
                data: {
                    contactId: payload.contactId,
                    title: payload.taskDetails.title,
                    dueDate: payload.taskDetails.dueDate ? new Date(payload.taskDetails.dueDate) : null,
                    status: 'PENDING',
                },
            });
        }
        catch (error) {
            this.logger.error('[CRM] Falló creación de Task:', error);
        }
    }
    async handleHandoffRequested(payload) {
        this.logger.log(`[CRM] Marcando Conversación como HANDOFF: ${payload.conversationId}`);
        try {
            await this.prisma.conversation.update({
                where: { id: payload.conversationId },
                data: { status: 'HANDOFF' },
            });
        }
        catch (error) {
            this.logger.error('[CRM] Falló actualización a HANDOFF:', error);
        }
    }
    async handleMessageSent(payload) {
        this.logger.log(`[CRM] Mensaje enviado por canal ${payload.channel}. Registrando métricas...`);
        try {
            const conversation = await this.prisma.conversation.findUnique({
                where: { id: payload.conversationId },
                select: { contactId: true }
            });
            if (conversation) {
                await this.prisma.businessMemory.upsert({
                    where: { contactId: conversation.contactId },
                    update: { lastInteraction: new Date() },
                    create: { contactId: conversation.contactId, lastInteraction: new Date() }
                });
            }
        }
        catch (error) {
            this.logger.error('[CRM] Falló registro de métrica message.sent:', error);
        }
    }
};
exports.CrmEventListenerService = CrmEventListenerService;
__decorate([
    (0, event_emitter_1.OnEvent)('memory.updated', { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CrmEventListenerService.prototype, "handleMemoryUpdated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('task.created', { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CrmEventListenerService.prototype, "handleTaskCreated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('handoff.requested', { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CrmEventListenerService.prototype, "handleHandoffRequested", null);
__decorate([
    (0, event_emitter_1.OnEvent)('message.sent', { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CrmEventListenerService.prototype, "handleMessageSent", null);
exports.CrmEventListenerService = CrmEventListenerService = CrmEventListenerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CrmEventListenerService);
//# sourceMappingURL=crm-event-listener.service.js.map