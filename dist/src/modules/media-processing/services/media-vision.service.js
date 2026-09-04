"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MediaVisionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaVisionService = void 0;
const common_1 = require("@nestjs/common");
let MediaVisionService = MediaVisionService_1 = class MediaVisionService {
    logger = new common_1.Logger(MediaVisionService_1.name);
    async analyzeImage(media, caption) {
        try {
            this.logger.log(`Descargando y analizando imagen visualmente (mimetype: ${media.mimetype || 'image/jpeg'})...`);
            const base64Data = await this.downloadImageBase64(media);
            if (!base64Data) {
                this.logger.warn('No se pudo obtener la imagen en base64 de WAHA.');
                return caption ? `📸 [Imagen adjunta con texto]: "${caption}"` : '📸 [El usuario adjuntó una imagen]';
            }
            const mimetype = media.mimetype || 'image/jpeg';
            const dataUrl = `data:${mimetype};base64,${base64Data}`;
            const analysis = await this.callVisionModel(dataUrl, caption);
            this.logger.log(`Análisis visual completado: "${analysis.substring(0, 80)}..."`);
            return analysis;
        }
        catch (error) {
            this.logger.error(`Error analizando imagen: ${error.message}`, error.stack);
            return caption
                ? `📸 [El usuario envió una imagen con el texto]: "${caption}"`
                : '📸 [El usuario envió una imagen o captura de pantalla]';
        }
    }
    async downloadImageBase64(media) {
        if (media.data) {
            return media.data;
        }
        if (media.url) {
            const resolvedUrl = this.resolveWahaMediaUrl(media.url);
            this.logger.log(`Descargando imagen de WAHA desde: ${resolvedUrl}`);
            const apiKey = process.env.WAHA_API_KEY || '';
            const headers = {};
            if (apiKey)
                headers['X-Api-Key'] = apiKey;
            const response = await fetch(resolvedUrl, { headers });
            if (!response.ok) {
                throw new Error(`Error descargando imagen de WAHA: ${response.status} ${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer).toString('base64');
        }
        return null;
    }
    resolveWahaMediaUrl(url) {
        const wahaBase = (process.env.WAHA_API_URL || 'http://waha:3000').replace(/\/+$/, '');
        if (url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
            const path = url.replace(/^https?:\/\/[^\/]+/, '');
            return `${wahaBase}${path}`;
        }
        if (url.startsWith('/')) {
            return `${wahaBase}${url}`;
        }
        return url;
    }
    async callVisionModel(dataUrl, caption) {
        const provider = (process.env.AI_PROVIDER ?? 'openai').toLowerCase();
        const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || '';
        let baseUrl = process.env.AI_BASE_URL ?? 'https://api.openai.com/v1';
        let model = process.env.AI_VISION_MODEL || process.env.AI_MODEL || 'google/gemini-2.5-flash-lite';
        if (provider === 'gemini') {
            baseUrl = process.env.AI_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta/openai';
            if (!process.env.AI_VISION_MODEL)
                model = 'gemini-1.5-flash';
        }
        else if (provider === 'openrouter') {
            baseUrl = process.env.AI_BASE_URL ?? 'https://openrouter.ai/api/v1';
            if (!process.env.AI_VISION_MODEL)
                model = 'google/gemini-2.5-flash-lite';
        }
        const systemPrompt = `Eres un auditor visual y experto OCR para un CRM y sistema de ventas educativas por WhatsApp.
Analiza con máxima precisión la imagen adjunta y clasifícala estrictamente:

INSTRUCCIONES CLAVE:
1. SI ES UN COMPROBANTE DE PAGO BANCARIO REAL (Captura de pantalla de Pago Móvil, Transferencia bancaria, Zelle, Depósito, Binance, etc.):
   Extrae con fidelidad los datos visibles en este formato exacto:
   "📸 [Comprobante de Pago Detectado]: Banco: {Nombre del banco o plataforma} | Referencia: #{Número de referencia} | Monto: {Monto exacto y moneda} | Fecha: {Fecha/Hora}. (Soporte de pago válido)"

2. SI ES UNA FOTO DE UNA PERSONA, ROSTRO, SELFIE, PAISAJE, FOTO PERSONAL O MEME:
   NUNCA digas que es un comprobante de pago. Describe brevemente lo que se ve:
   "📸 [Foto enviada por el usuario]: Imagen de {descripción corta, ej: un rostro/selfie/foto personal}. (NO es un comprobante de pago)"

3. SI ES UNA DUDA PEDAGÓGICA, FOTO DE LIBRO, EXAMEN, PLANIFICACIÓN O GUÍA:
   Describe el contenido y la pregunta:
   "📸 [Imagen Pedagógica/Consulta Adjunta]: {Resumen claro del ejercicio o guía para responderle}"

4. CUALQUIER OTRA IMAGEN:
   "📸 [Imagen adjunta]: {Breve descripción visual (NO es comprobante de pago)}"

Sé directo, profesional y conciso.`;
        const userPrompt = caption
            ? `Analiza esta imagen adjunta. El usuario además escribió este texto adjunto: "${caption}"`
            : `Analiza esta imagen adjunta.`;
        const body = {
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: userPrompt },
                        { type: 'image_url', image_url: { url: dataUrl } }
                    ]
                }
            ],
            temperature: 0.1,
            max_tokens: 300,
        };
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        };
        if (provider === 'openrouter') {
            headers['HTTP-Referer'] = 'https://os.ingeniodigital.shop';
            headers['X-Title'] = 'Ingenio OS';
        }
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Error en API Vision (${response.status}): ${errText}`);
        }
        const result = await response.json();
        const content = result.choices?.[0]?.message?.content;
        return content && content.trim() !== ''
            ? content.trim()
            : '📸 [Comprobante o imagen adjunta por el usuario]';
    }
};
exports.MediaVisionService = MediaVisionService;
exports.MediaVisionService = MediaVisionService = MediaVisionService_1 = __decorate([
    (0, common_1.Injectable)()
], MediaVisionService);
//# sourceMappingURL=media-vision.service.js.map