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
var ContextBuilderService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextBuilderService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../shared/database/prisma.service");
const kos_loader_service_1 = require("./kos-loader.service");
const prompt_composer_service_1 = require("./prompt-composer.service");
let ContextBuilderService = ContextBuilderService_1 = class ContextBuilderService {
    prisma;
    kosLoader;
    promptComposer;
    logger = new common_1.Logger(ContextBuilderService_1.name);
    constructor(prisma, kosLoader, promptComposer) {
        this.prisma = prisma;
        this.kosLoader = kosLoader;
        this.promptComposer = promptComposer;
    }
    async buildContext(tenantId, contactId, conversationId, content = null, funnelInstruction = null) {
        const kosBundle = await this.kosLoader.load(tenantId);
        const memory = await this.prisma.businessMemory.findUnique({
            where: { contactId },
        });
        if (memory) {
            this.logger.log(`Business Memory recuperada para el contacto ${contactId}.`);
        }
        else {
            this.logger.log(`No se encontró Business Memory para el contacto ${contactId}. Procediendo en blanco.`);
        }
        const rawHistory = await this.prisma.interaction.findMany({
            where: { conversationId },
            orderBy: { timestamp: 'desc' },
            take: 30,
        });
        const history = rawHistory.reverse();
        return this.promptComposer.compose({
            kosBundle,
            memory,
            history,
            currentMessage: content,
            activeGoal: funnelInstruction,
            conversationSummary: null,
            availableSkills: [],
        });
    }
    async buildFollowUpContext(tenantId, contactId, conversationId, ruleApplied) {
        const kosBundle = await this.kosLoader.load(tenantId);
        const memory = await this.prisma.businessMemory.findUnique({
            where: { contactId },
        });
        const rawHistory = await this.prisma.interaction.findMany({
            where: { conversationId },
            orderBy: { timestamp: 'desc' },
            take: 30,
        });
        const history = rawHistory.reverse();
        return this.promptComposer.compose({
            kosBundle,
            memory,
            history,
            mode: prompt_composer_service_1.PromptMode.FOLLOW_UP,
            followUpRule: ruleApplied
        });
    }
};
exports.ContextBuilderService = ContextBuilderService;
exports.ContextBuilderService = ContextBuilderService = ContextBuilderService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        kos_loader_service_1.KosLoaderService,
        prompt_composer_service_1.PromptComposerService])
], ContextBuilderService);
//# sourceMappingURL=context-builder.service.js.map