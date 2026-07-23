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
var HermesClientService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HermesClientService = void 0;
const common_1 = require("@nestjs/common");
const ai_provider_interface_1 = require("../providers/ai-provider.interface");
const ai_provider_factory_1 = require("../providers/ai-provider.factory");
const HERMES_TOOLS = [
    {
        type: 'function',
        function: {
            name: 'update_business_memory',
            description: 'Actualiza la memoria del lead en el CRM con información detectada en la conversación. Úsala siempre que el cliente mencione su empresa, intereses, objeciones, o cualquier dato relevante.',
            parameters: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: 'Nombre completo del contacto' },
                    company: { type: 'string', description: 'Nombre de la empresa o negocio' },
                    interests: { type: 'array', items: { type: 'string' }, description: 'Productos o servicios de interés' },
                    objections: { type: 'array', items: { type: 'string' }, description: 'Objeciones o preocupaciones expresadas' },
                    leadStatus: { type: 'string', enum: ['NEW', 'CONTACTED', 'WARM', 'HOT', 'DEMO', 'OFFER', 'SALE', 'CLIENT'], description: 'Estado actual del lead' },
                    tags: { type: 'array', items: { type: 'string' }, description: 'Etiquetas relevantes' },
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'create_task',
            description: 'Crea una tarea de seguimiento en el CRM para este contacto.',
            parameters: {
                type: 'object',
                properties: {
                    title: { type: 'string', description: 'Descripción de la tarea' },
                    dueDate: { type: 'string', description: 'Fecha de vencimiento en formato ISO 8601' },
                },
                required: ['title'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'handoff_to_human',
            description: 'Transfiere la conversación a un agente humano cuando la situación lo requiere.',
            parameters: {
                type: 'object',
                properties: {
                    reason: { type: 'string', description: 'Motivo del traspaso' },
                },
                required: ['reason'],
            },
        },
    },
];
let HermesClientService = HermesClientService_1 = class HermesClientService {
    aiProvider;
    logger = new common_1.Logger(HermesClientService_1.name);
    constructor(aiProvider) {
        this.aiProvider = aiProvider;
    }
    async generateResponse(messages) {
        try {
            const response = await this.aiProvider.chat(messages, {
                tools: HERMES_TOOLS,
                temperature: 0.4,
            });
            this.logger.log(`Response received from ${response.provider} | model: ${response.model}`);
            return {
                content: response.content,
                toolCalls: response.toolCalls,
            };
        }
        catch (error) {
            this.logger.error('Error calling AI provider', error.message);
            return {
                content: `Hermes no pudo procesar tu consulta en este momento. Por favor intenta de nuevo.`,
            };
        }
    }
};
exports.HermesClientService = HermesClientService;
exports.HermesClientService = HermesClientService = HermesClientService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(ai_provider_factory_1.AI_PROVIDER_TOKEN)),
    __metadata("design:paramtypes", [ai_provider_interface_1.IAiProvider])
], HermesClientService);
//# sourceMappingURL=hermes-client.service.js.map