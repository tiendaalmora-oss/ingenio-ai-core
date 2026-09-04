"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AiProviderFactory_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiProviderFactory = exports.AI_PROVIDER_TOKEN = void 0;
const common_1 = require("@nestjs/common");
const openai_compatible_provider_1 = require("./openai-compatible.provider");
exports.AI_PROVIDER_TOKEN = 'AI_PROVIDER';
let AiProviderFactory = AiProviderFactory_1 = class AiProviderFactory {
    logger = new common_1.Logger(AiProviderFactory_1.name);
    create() {
        const provider = (process.env.AI_PROVIDER ?? 'openai').toLowerCase();
        const apiKey = process.env.AI_API_KEY ?? '';
        const model = process.env.AI_MODEL ?? 'gpt-4o-mini';
        let baseUrl;
        let name;
        let extraHeaders = {};
        switch (provider) {
            case 'openrouter':
                baseUrl = process.env.AI_BASE_URL ?? 'https://openrouter.ai/api/v1';
                name = 'OpenRouter';
                extraHeaders = {
                    'HTTP-Referer': 'https://os.ingeniodigital.shop',
                    'X-Title': 'Ingenio OS',
                };
                break;
            case 'gemini':
                baseUrl = process.env.AI_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta/openai';
                name = 'Gemini';
                break;
            case 'ollama':
                baseUrl = process.env.AI_BASE_URL ?? 'http://localhost:11434/v1';
                name = 'Ollama';
                break;
            case 'openai':
            default:
                baseUrl = process.env.AI_BASE_URL ?? 'https://api.openai.com/v1';
                name = 'OpenAI';
                break;
        }
        this.logger.log(`AI Provider initialized: ${name} | model: ${model} | url: ${baseUrl}`);
        return new openai_compatible_provider_1.OpenAiCompatibleProvider(baseUrl, apiKey, model, name, extraHeaders);
    }
};
exports.AiProviderFactory = AiProviderFactory;
exports.AiProviderFactory = AiProviderFactory = AiProviderFactory_1 = __decorate([
    (0, common_1.Injectable)()
], AiProviderFactory);
//# sourceMappingURL=ai-provider.factory.js.map