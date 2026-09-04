"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var FunnelGeneratorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FunnelGeneratorService = void 0;
const common_1 = require("@nestjs/common");
let FunnelGeneratorService = FunnelGeneratorService_1 = class FunnelGeneratorService {
    logger = new common_1.Logger(FunnelGeneratorService_1.name);
    async generateFunnel(prompt) {
        this.logger.log(`Generando DSL con IA: "${prompt}"`);
        const systemMessage = `
Eres Hermes, el Arquitecto de Automatizaciones de Ingenio OS.
Tu tarea es traducir el deseo del usuario en un JSON válido del Automation DSL (Domain Specific Language) de Ingenio OS.
NO debes generar coordenadas X/Y ni detalles visuales. Solo lógica pura de negocio.

NODOS PERMITIDOS (type):
- event: Disparadores (Ej. "Mensaje recibido"). Siempre debe haber uno inicial.
- ai: Procesamiento (Ej. "Detectar intención").
- crm: Acciones (Ej. "Crear Lead").
- whatsapp: Comunicaciones (Ej. "Enviar catálogo").
- skill: Capacidades externas.
- automation: Lógica general o pausas.
- condition: Bifurcación.
- end: Fin del flujo.

FORMATO EXACTO DEL DSL (JSON puro sin markdown):
{
  "steps": [
    {
      "id": "trigger_1",
      "type": "event",
      "name": "Mensaje Recibido",
      "description": "El cliente escribió pidiendo información.",
      "next": "ai_1"
    },
    {
      "id": "ai_1",
      "type": "ai",
      "name": "Evaluar intención",
      "description": "Verificar si el cliente quiere comprar.",
      "next": "cond_1"
    },
    {
      "id": "cond_1",
      "type": "condition",
      "name": "¿Alta intención?",
      "onTrue": "wa_1",
      "onFalse": "end_1"
    },
    {
      "id": "wa_1",
      "type": "whatsapp",
      "name": "Enviar catálogo PDF",
      "next": "end_2"
    }
  ]
}
`;
        const hermesUrl = process.env.HERMES_BASE_URL || 'http://localhost:4000/api/v1/hermes';
        const apiKey = process.env.HERMES_API_KEY || '';
        const model = process.env.HERMES_MODEL || 'hermes';
        try {
            const response = await fetch(`${hermesUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'X-Hermes-Session-Id': 'ingenio-core-automation'
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        { role: 'system', content: systemMessage },
                        { role: 'user', content: prompt }
                    ],
                    response_format: { type: 'json_object' }
                })
            });
            if (!response.ok) {
                throw new Error(`Hermes API respondió con error: ${response.status}`);
            }
            const result = await response.json();
            const content = result.choices?.[0]?.message?.content || '{}';
            return JSON.parse(content);
        }
        catch (error) {
            this.logger.error('Error al generar embudo con IA:', error.message);
            return {
                steps: [
                    {
                        id: "trigger_fallback",
                        type: "event",
                        name: "Fallo de conexión IA",
                        description: "No se pudo contactar al generador."
                    }
                ]
            };
        }
    }
};
exports.FunnelGeneratorService = FunnelGeneratorService;
exports.FunnelGeneratorService = FunnelGeneratorService = FunnelGeneratorService_1 = __decorate([
    (0, common_1.Injectable)()
], FunnelGeneratorService);
//# sourceMappingURL=funnel-generator.service.js.map