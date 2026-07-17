import { Injectable, Logger } from '@nestjs/common';
import { AutomationDsl } from './automation-compiler.service';

@Injectable()
export class FunnelGeneratorService {
  private readonly logger = new Logger(FunnelGeneratorService.name);

  async generateFunnel(prompt: string): Promise<AutomationDsl> {
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
    } catch (error: any) {
      this.logger.error('Error al generar embudo con IA:', error.message);
      // Return a basic fallback if AI is down, so the canvas doesn't break
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
}
