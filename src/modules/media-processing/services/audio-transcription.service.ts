import { Injectable, Logger } from '@nestjs/common';

export interface WahaMediaPayload {
  url?: string;
  data?: string; // base64
  mimetype?: string;
  filename?: string;
}

export interface MediaContext {
  tenantId?: string;
  session?: string;
}

@Injectable()
export class AudioTranscriptionService {
  private readonly logger = new Logger(AudioTranscriptionService.name);

  /**
   * Transcribe un archivo de audio o nota de voz proveniente de WAHA / Meta a texto en lenguaje natural.
   */
  async transcribe(media: WahaMediaPayload, context?: MediaContext): Promise<string> {
    try {
      this.logger.log(`Descargando y procesando audio (mimetype: ${media.mimetype || 'audio/ogg'}, session: ${context?.session || 'default'})...`);
      
      const audioBuffer = await this.downloadMediaBuffer(media, context);
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

    } catch (error: any) {
      this.logger.error(`Error transcribiendo audio: ${error.message}`, error.stack);
      return '🎤 [Nota de voz recibida del usuario]';
    }
  }

  /**
   * Resuelve la configuración de conexión de WAHA (URL y API Key) de acuerdo al tenant y sesión.
   * Aísla la campaña de producción (ferreos / Kits Docentes) en WAHA_PROD_URL y dirige
   * subcuentas y números de prueba a WAHA_SANDBOX_URL.
   */
  private resolveWahaConfig(context?: MediaContext): { apiUrl: string; apiKey: string } {
    const isProd =
      context?.tenantId === 'dba1c54c-89c6-41e9-ae9d-03613377a5b3' ||
      context?.session === 'ferreos';

    if (isProd) {
      const rawUrl = process.env.WAHA_PROD_URL || process.env.WAHA_API_URL || 'https://waha.ingeniodigital.shop';
      return {
        apiUrl: rawUrl.replace(/\/+$/, ''),
        apiKey: process.env.WAHA_PROD_API_KEY || process.env.WAHA_API_KEY || '',
      };
    }

    const rawUrl = process.env.WAHA_SANDBOX_URL || process.env.WAHA_API_URL || 'https://waha.ingeniodigital.shop';
    return {
      apiUrl: rawUrl.replace(/\/+$/, ''),
      apiKey: process.env.WAHA_SANDBOX_API_KEY || process.env.WAHA_API_KEY || '',
    };
  }

  /**
   * Reescribe URLs locales, de contenedor Docker o relativas al endpoint real de WAHA correspondiente.
   */
  private resolveWahaMediaUrl(url: string, wahaBaseUrl: string): string {
    const base = wahaBaseUrl.replace(/\/+$/, '');
    if (
      url.startsWith('http://localhost') ||
      url.startsWith('http://127.0.0.1') ||
      url.startsWith('http://waha:') ||
      url.startsWith('http://waha-sandbox:') ||
      url.startsWith('/')
    ) {
      const path = url.startsWith('/') ? url : url.replace(/^https?:\/\/[^\/]+/, '');
      return `${base}${path}`;
    }

    // Si la URL apunta al host WAHA opuesto por configuración estática del contenedor WAHA
    const prodHost = (process.env.WAHA_PROD_URL || 'https://waha.ingeniodigital.shop').replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const sandboxHost = (process.env.WAHA_SANDBOX_URL || 'https://waha-sandbox.ingeniodigital.shop').replace(/^https?:\/\//, '').replace(/\/+$/, '');

    try {
      const parsed = new URL(url);
      if (parsed.host === prodHost || parsed.host === sandboxHost) {
        const path = `${parsed.pathname}${parsed.search}`;
        return `${base}${path}`;
      }
    } catch (_) {}

    return url;
  }

  /**
   * Descarga el archivo de audio desde WAHA (vía URL o base64).
   */
  private async downloadMediaBuffer(media: WahaMediaPayload, context?: MediaContext): Promise<Buffer | null> {
    if (media.data) {
      return Buffer.from(media.data, 'base64');
    }

    if (media.url) {
      const { apiUrl, apiKey } = this.resolveWahaConfig(context);
      const resolvedUrl = this.resolveWahaMediaUrl(media.url, apiUrl);
      this.logger.log(`Descargando audio de WAHA (${context?.session || 'default'}) desde: ${resolvedUrl}`);

      const headers: Record<string, string> = {};
      if (apiKey) headers['X-Api-Key'] = apiKey;

      const response = await fetch(resolvedUrl, { headers });
      if (!response.ok) {
        throw new Error(`Error descargando audio de WAHA: ${response.status} ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    return null;
  }

  /**
   * Llama a la API de Whisper (Groq / OpenAI) o a OpenRouter/Gemini con soporte de audio.
   */
  private async sendToWhisperApi(audioBuffer: Buffer, mimetype: string): Promise<string> {
    const groqKey = process.env.GROQ_API_KEY;
    const provider = (process.env.AI_PROVIDER || 'openai').toLowerCase();
    const openaiKey = process.env.OPENAI_API_KEY;
    const aiApiKey = process.env.AI_API_KEY;

    // Caso 1: Groq Whisper (el más rápido y especializado)
    if (groqKey) {
      return this.callWhisperEndpoint(
        'https://api.groq.com/openai/v1/audio/transcriptions',
        groqKey,
        'whisper-large-v3-turbo',
        audioBuffer,
        mimetype
      );
    }

    // Caso 2: OpenAI Whisper oficial
    if (openaiKey && provider === 'openai') {
      return this.callWhisperEndpoint(
        'https://api.openai.com/v1/audio/transcriptions',
        openaiKey,
        'whisper-1',
        audioBuffer,
        mimetype
      );
    }

    // Caso 3: OpenRouter / Gemini Multimodal Audio (input_audio nativo)
    if (provider === 'openrouter' || provider === 'gemini' || aiApiKey) {
      try {
        const apiKey = aiApiKey || openaiKey || '';
        const baseUrl = process.env.AI_BASE_URL || (provider === 'gemini' 
          ? 'https://generativelanguage.googleapis.com/v1beta/openai' 
          : 'https://openrouter.ai/api/v1');

        const model = process.env.AI_MODEL || 'google/gemini-2.5-flash-lite';
        const base64Audio = audioBuffer.toString('base64');
        
        let format = 'ogg';
        const rawMime = mimetype.toLowerCase();
        if (rawMime.includes('ogg') || rawMime.includes('opus')) format = 'ogg';
        else if (rawMime.includes('mp3') || rawMime.includes('mpeg')) format = 'mp3';
        else if (rawMime.includes('wav')) format = 'wav';
        else if (rawMime.includes('m4a') || rawMime.includes('mp4') || rawMime.includes('aac')) format = 'aac';
        else if (rawMime.includes('flac')) format = 'flac';

        this.logger.log(`Transcribiendo audio vía ${provider} (${model}, formato: ${format})...`);

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
                    type: 'input_audio', 
                    input_audio: {
                      data: base64Audio,
                      format: format,
                    } 
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
          if (text && text.length > 0) return text;
        } else {
          const errText = await response.text().catch(() => '');
          this.logger.warn(`OpenRouter multimodal audio response status: ${response.status} - ${errText}`);
        }
      } catch (e: any) {
        this.logger.warn(`Fallback multimodal audio error: ${e.message}`);
      }
    }

    // Fallback general a endpoint OpenAI si hay apiKey
    const fallbackKey = openaiKey || aiApiKey || '';
    if (fallbackKey) {
      return this.callWhisperEndpoint(
        'https://api.openai.com/v1/audio/transcriptions',
        fallbackKey,
        'whisper-1',
        audioBuffer,
        mimetype
      );
    }

    return 'Mensaje de voz enviado por el cliente';
  }

  private async callWhisperEndpoint(
    apiUrl: string,
    apiKey: string,
    model: string,
    audioBuffer: Buffer,
    mimetype: string
  ): Promise<string> {
    let filename = 'voice_note.ogg';
    if (mimetype.includes('mp4') || mimetype.includes('m4a')) filename = 'voice_note.m4a';
    else if (mimetype.includes('wav')) filename = 'voice_note.wav';
    else if (mimetype.includes('mp3')) filename = 'voice_note.mp3';

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
}
