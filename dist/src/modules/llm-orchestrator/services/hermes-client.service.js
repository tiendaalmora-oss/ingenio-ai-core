"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var HermesClientService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HermesClientService = void 0;
const common_1 = require("@nestjs/common");
let HermesClientService = HermesClientService_1 = class HermesClientService {
    logger = new common_1.Logger(HermesClientService_1.name);
    async generateResponse(messages) {
        const hermesUrl = process.env.HERMES_BASE_URL || 'http://localhost:4000/api/v1/hermes';
        const apiKey = process.env.HERMES_API_KEY || '';
        this.logger.log(`LLM Inference Triggered contra Hermes API real en ${hermesUrl}...`);
        const model = process.env.HERMES_MODEL || 'hermes';
        try {
            const response = await fetch(`${hermesUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'X-Hermes-Session-Id': 'ingenio-core-default-session'
                },
                body: JSON.stringify({
                    model,
                    messages: messages
                })
            });
            if (!response.ok) {
                throw new Error(`Hermes API respondió con error: ${response.status} ${response.statusText}`);
            }
            const result = await response.json();
            const choice = result.choices?.[0]?.message;
            let parsedToolCalls = undefined;
            if (choice?.tool_calls && choice.tool_calls.length > 0) {
                parsedToolCalls = choice.tool_calls.map((tc) => {
                    let args = {};
                    try {
                        args = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments;
                    }
                    catch (e) { }
                    return {
                        id: tc.id,
                        name: tc.function.name,
                        arguments: args
                    };
                });
            }
            return {
                content: choice?.content || undefined,
                toolCalls: parsedToolCalls
            };
        }
        catch (error) {
            this.logger.error('Error llamando a la API de Hermes', error.message);
            return { content: `(Hermes Auto-Response Fallback): Ocurrió un error conectando con la API de Hermes.` };
        }
    }
};
exports.HermesClientService = HermesClientService;
exports.HermesClientService = HermesClientService = HermesClientService_1 = __decorate([
    (0, common_1.Injectable)()
], HermesClientService);
//# sourceMappingURL=hermes-client.service.js.map