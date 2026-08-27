import { Injectable, Logger } from '@nestjs/common';
import { WahaMediaPayload } from './audio-transcription.service';

@Injectable()
export class MediaVisionService {
  private readonly logger = new Logger(MediaVisionService.name);

  /**
   * Analiza una imagen recibida por WhatsApp (comprobante de pago o imagen general) mediante IA Multimodal.
   */
  async analyzeImage(media: WahaMediaPayload, caption?: string): Promise<string> {
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

    } catch (error: any) {
      this.logger.error(`Error analizando imagen: ${error.message}`, error.stack);
      return caption 
        ? `📸 [El usuario envió una imagen con el texto]: "${caption}"`
        : '📸 [El usuario envió una imagen o captura de pantalla]';
    }
  }

  /**
   * Descarga la imagen y la retorna en string base64.
   */
  private async downloadImageBase64(media: WahaMediaPayload): Promise<string | null> {
    if (media.data) {
      return media.data;
    }

    if (media.url) {
      const apiKey = process.env.WAHA_API_KEY || '';
      const headers: Record<string, string> = {};
      if (apiKey) headers['X-Api-Key'] = apiKey;

      const response = await fetch(media.url, { headers });
      if (!response.ok) {
        throw new Error(`Error descargando imagen de WAHA: ${response.status} ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer).toString('base64');
    }

    return null;
  }

  /**
   * Envía la imagen al modelo de Visión (OpenAI / Gemini / OpenRouter) configurado en el entorno.
   */
  private async callVisionModel(dataUrl: string, caption?: string): Promise<string> {
    const provider = (process.env.AI_PROVIDER ?? 'openai').toLowerCase();
    const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || '';
    
    let baseUrl = process.env.AI_BASE_URL ?? 'https://api.openai.com/v1';
    let model = process.env.AI_VISION_MODEL || process.env.AI_MODEL || 'gpt-4o-mini';

    if (provider === 'gemini') {
      baseUrl = process.env.AI_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta/openai';
      if (!process.env.AI_VISION_MODEL) model = 'gemini-1.5-flash';
    } else if (provider === 'openrouter') {
      baseUrl = process.env.AI_BASE_URL ?? 'https://openrouter.ai/api/v1';
      if (!process.env.AI_VISION_MODEL) model = 'google/gemini-flash-1.5';
    }

    const systemPrompt = `Eres un auditor visual y experto OCR para un CRM y sistema de ventas educativas por WhatsApp.
Analiza con máxima precisión la imagen adjunta.

INSTRUCCIONES CLAVE:
1. SI ES UN COMPROBANTE DE PAGO (Transferencia bancaria, Pago Móvil, Zelle, Depósito, Binance, etc.):
   Extrae los datos en este formato exacto:
   "📸 [Comprobante de Pago Detectado]: Banco: {Nombre del banco o plataforma, ej. BDV, Banesco, Pago Móvil} | Referencia: #{Número de referencia} | Monto: {Monto exacto y moneda, ej. 7.250 Bs o 12.000 Bs} | Fecha: {Fecha/Hora del pago} | Estado: {Aprobado/Exitoso}. (El usuario adjuntó este comprobante como soporte de pago)"

2. SI ES UNA DUDA PEDAGÓGICA, FOTO DE LIBRO, EXAMEN O GUÍA:
   Describe el contenido y la pregunta:
   "📸 [Imagen Pedagógica/Consulta Adjunta]: {Resumen claro del contenido de la imagen o ejercicio para responderle}"

3. SI ES OTRA IMAGEN O MEME:
   "📸 [Imagen adjunta]: {Breve descripción visual}"

Sé directo, profesional y conciso.`;

    const userPrompt = caption 
      ? `Analiza esta imagen adjunta. El usuario además escribió este texto adjunto: "${caption}"`
      : `Analiza esta imagen adjunta.`;

    const body: any = {
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

    const headers: Record<string, string> = {
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
}
