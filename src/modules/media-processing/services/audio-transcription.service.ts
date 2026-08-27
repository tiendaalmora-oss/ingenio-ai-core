import { Injectable, Logger } from '@nestjs/common';

export interface WahaMediaPayload {
  url?: string;
  data?: string; // base64
  mimetype?: string;
  filename?: string;
}

@Injectable()
export class AudioTranscriptionService {
  private readonly logger = new Logger(AudioTranscriptionService.name);

  /**
   * Transcribe un archivo de audio o nota de voz proveniente de WAHA / Meta a texto en lenguaje natural.
   */
  async transcribe(media: WahaMediaPayload): Promise<string> {
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

    } catch (error: any) {
      this.logger.error(`Error transcribiendo audio: ${error.message}`, error.stack);
      return '🎤 [Nota de voz recibida del usuario]';
    }
  }

  /**
   * Descarga el archivo de audio desde WAHA (vía URL o base64).
   */
  private async downloadMediaBuffer(media: WahaMediaPayload): Promise<Buffer | null> {
    if (media.data) {
      return Buffer.from(media.data, 'base64');
    }

    if (media.url) {
      const resolvedUrl = this.resolveWahaMediaUrl(media.url);
      this.logger.log(`Descargando audio de WAHA desde: ${resolvedUrl}`);

      const apiKey = process.env.WAHA_API_KEY || '';
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
   * Reescribe URLs locales o relativas al endpoint real de WAHA configurado.
   */
  private resolveWahaMediaUrl(url: string): string {
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

    // Caso 3: OpenRouter / Gemini Multimodal Audio
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
          if (text && text.length > 0) return text;
        } else {
          this.logger.warn(`OpenRouter multimodal audio response status: ${response.status}`);
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
