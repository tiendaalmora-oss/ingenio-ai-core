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
      const apiKey = process.env.WAHA_API_KEY || '';
      const headers: Record<string, string> = {};
      if (apiKey) headers['X-Api-Key'] = apiKey;

      const response = await fetch(media.url, { headers });
      if (!response.ok) {
        throw new Error(`Error descargando audio de WAHA: ${response.status} ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    return null;
  }

  /**
   * Llama a la API de Whisper (Groq Whisper o OpenAI Whisper) usando FormData estándar.
   */
  private async sendToWhisperApi(audioBuffer: Buffer, mimetype: string): Promise<string> {
    const groqKey = process.env.GROQ_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;

    const apiKey = groqKey || openaiKey;
    if (!apiKey) {
      this.logger.warn('No se configuró API Key para transcripción de audio (GROQ_API_KEY o OPENAI_API_KEY / AI_API_KEY).');
      return 'Nota de voz del usuario';
    }

    const apiUrl = groqKey 
      ? 'https://api.groq.com/openai/v1/audio/transcriptions'
      : 'https://api.openai.com/v1/audio/transcriptions';

    const model = groqKey ? 'whisper-large-v3-turbo' : 'whisper-1';

    // Determinar extensión adecuada según mimetype
    let filename = 'voice_note.ogg';
    if (mimetype.includes('mp4') || mimetype.includes('m4a')) filename = 'voice_note.m4a';
    else if (mimetype.includes('wav')) filename = 'voice_note.wav';
    else if (mimetype.includes('mp3')) filename = 'voice_note.mp3';

    // Construcción de FormData nativo de Node 18+
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimetype });
    formData.append('file', blob, filename);
    formData.append('model', model);
    formData.append('language', 'es');
    formData.append('response_format', 'json');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Error en API Whisper (${response.status}): ${errText}`);
    }

    const result = await response.json();
    return result.text || '';
  }
}
