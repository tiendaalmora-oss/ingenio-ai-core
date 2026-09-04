"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAiCompatibleProvider = void 0;
const common_1 = require("@nestjs/common");
const ai_provider_interface_1 = require("./ai-provider.interface");
class OpenAiCompatibleProvider extends ai_provider_interface_1.IAiProvider {
    baseUrl;
    apiKey;
    model;
    providerName;
    extraHeaders;
    logger = new common_1.Logger('AiProvider');
    constructor(baseUrl, apiKey, model, providerName, extraHeaders = {}) {
        super();
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        this.model = model;
        this.providerName = providerName;
        this.extraHeaders = extraHeaders;
    }
    async chat(messages, options) {
        const body = {
            model: this.model,
            messages,
        };
        if (options?.tools && options.tools.length > 0) {
            body.tools = options.tools;
            body.tool_choice = options.toolChoice || 'auto';
        }
        if (options?.temperature !== undefined)
            body.temperature = options.temperature;
        if (options?.maxTokens !== undefined)
            body.max_tokens = options.maxTokens;
        this.logger.log(`[${this.providerName}] Calling ${this.baseUrl}/chat/completions → model: ${this.model}`);
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                ...this.extraHeaders,
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`[${this.providerName}] ${response.status} ${response.statusText}: ${errText}`);
        }
        const result = await response.json();
        const choice = result.choices?.[0]?.message;
        let toolCalls;
        if (choice?.tool_calls?.length > 0) {
            toolCalls = choice.tool_calls.map((tc) => {
                let args = {};
                try {
                    args = typeof tc.function.arguments === 'string'
                        ? JSON.parse(tc.function.arguments)
                        : tc.function.arguments;
                }
                catch (_) { }
                return { id: tc.id ?? tc.function.name, name: tc.function.name, arguments: args };
            });
        }
        return {
            content: choice?.content ?? undefined,
            toolCalls,
            provider: this.providerName,
            model: this.model,
        };
    }
}
exports.OpenAiCompatibleProvider = OpenAiCompatibleProvider;
//# sourceMappingURL=openai-compatible.provider.js.map