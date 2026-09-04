"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AudioTranscriptionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioTranscriptionService = void 0;
const common_1 = require("@nestjs/common");
let AudioTranscriptionService = AudioTranscriptionService_1 = class AudioTranscriptionService {
    logger = new common_1.Logger(AudioTranscriptionService_1.name);
    async transcribe(media) {
        try {
            this.logger.log(`Descargando y procesando audio (mimetype: ${media.mimetype || 'audio/ogg'})...`);
            const audioBuffer = await this.downloadMediaBuffer(media);
            if (!audioBuffer || audioBuffer.length === 0) {
                this.logger.warn('No se pudo obtener el buffer de audio de WAHA.');
                return '🎤 [Nota de voz recibida - audio no legible]';
            }
            const transcription = await this.sendToWhisperApi(audioBuffer, media.mimetype || 'audio/ogg');
            if (!transcription || transcription.trim() === '') {
                return '🎤 [Nota de voz recibida - sin audio detectable]';
            }
            this.logger.log(`Audio transcrito con éxito: "${transcription.substring(0, 60)}..."`);
            return `🎤 [Nota de voz del usuario]: "${transcription.trim()}"`;
        }
        catch (error) {
            this.logger.error(`Error transcribiendo audio: ${error.message}`, error.stack);
            return '🎤 [Nota de voz recibida del usuario]';
        }
    }
    async downloadMediaBuffer(media) {
        if (media.data) {
            return Buffer.from(media.data, 'base64');
        }
        if (media.url) {
            const resolvedUrl = this.resolveWahaMediaUrl(media.url);
            this.logger.log(`Descargando audio de WAHA desde: ${resolvedUrl}`);
            const apiKey = process.env.WAHA_API_KEY || '';
            const headers = {};
            if (apiKey)
                headers['X-Api-Key'] = apiKey;
            const response = await fetch(resolvedUrl, { headers });
            if (!response.ok) {
                throw new Error(`Error descargando audio de WAHA: ${response.status} ${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer);
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
    async sendToWhisperApi(audioBuffer, mimetype) {
        const groqKey = process.env.GROQ_API_KEY;
        const provider = (process.env.AI_PROVIDER || 'openai').toLowerCase();
        const openaiKey = process.env.OPENAI_API_KEY;
        const aiApiKey = process.env.AI_API_KEY;
        if (groqKey) {
            return this.callWhisperEndpoint('https://api.groq.com/openai/v1/audio/transcriptions', groqKey, 'whisper-large-v3-turbo', audioBuffer, mimetype);
        }
        if (openaiKey && provider === 'openai') {
            return this.callWhisperEndpoint('https://api.openai.com/v1/audio/transcriptions', openaiKey, 'whisper-1', audioBuffer, mimetype);
        }
        if (provider === 'openrouter' || provider === 'gemini' || aiApiKey) {
            try {
                const apiKey = aiApiKey || openaiKey || '';
                const baseUrl = process.env.AI_BASE_URL || (provider === 'gemini'
                    ? 'https://generativelanguage.googleapis.com/v1beta/openai'
                    : 'https://openrouter.ai/api/v1');
                const model = process.env.AI_MODEL || 'google/gemini-2.5-flash-lite';
                const base64Audio = audioBuffer.toString('base64');
                const cleanMime = mimetype.split(';')[0] || 'audio/ogg';
                const dataUrl = `data:${cleanMime};base64,${base64Audio}`;
                this.logger.log(`Transcribiendo audio vía ${provider} (${model})...`);
                const response = await fetch(`${baseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                        'HTTP-Referer': 'https://os.ingeniodigital.shop',
                        'X-Title': 'Ingenio OS',
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [
                            {
                                role: 'user',
                                content: [
                                    {
                                        type: 'text',
                                        text: 'Por favor transcribe fiel y exactamente palabra por palabra lo que dice la persona en este audio en español. Devuelve ÚNICAMENTE el texto que dijo la persona, sin comentarios, sin formato extra y sin comillas.'
                                    },
                                    {
                                        type: 'image_url',
                                        image_url: { url: dataUrl }
                                    }
                                ]
                            }
                        ],
                        temperature: 0.1,
                        max_tokens: 300,
                    })
                });
                if (response.ok) {
                    const data = await response.json();
                    const text = data.choices?.[0]?.message?.content?.trim();
                    if (text && text.length > 0)
                        return text;
                }
                else {
                    this.logger.warn(`OpenRouter multimodal audio response status: ${response.status}`);
                }
            }
            catch (e) {
                this.logger.warn(`Fallback multimodal audio error: ${e.message}`);
            }
        }
        const fallbackKey = openaiKey || aiApiKey || '';
        if (fallbackKey) {
            return this.callWhisperEndpoint('https://api.openai.com/v1/audio/transcriptions', fallbackKey, 'whisper-1', audioBuffer, mimetype);
        }
        return 'Mensaje de voz enviado por el cliente';
    }
    async callWhisperEndpoint(apiUrl, apiKey, model, audioBuffer, mimetype) {
        let filename = 'voice_note.ogg';
        if (mimetype.includes('mp4') || mimetype.includes('m4a'))
            filename = 'voice_note.m4a';
        else if (mimetype.includes('wav'))
            filename = 'voice_note.wav';
        else if (mimetype.includes('mp3'))
            filename = 'voice_note.mp3';
        const formData = new FormData();
        const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimetype });
        formData.append('file', blob, filename);
        formData.append('model', model);
        formData.append('language', 'es');
        formData.append('response_format', 'json');
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}` },
            body: formData,
        });
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Error Whisper (${response.status}): ${errText}`);
        }
        const result = await response.json();
        return result.text || '';
    }
};
exports.AudioTranscriptionService = AudioTranscriptionService;
exports.AudioTranscriptionService = AudioTranscriptionService = AudioTranscriptionService_1 = __decorate([
    (0, common_1.Injectable)()
], AudioTranscriptionService);
//# sourceMappingURL=audio-transcription.service.js.map