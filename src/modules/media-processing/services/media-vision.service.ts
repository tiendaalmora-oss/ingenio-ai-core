import { Injectable, Logger } from '@nestjs/common';
import { WahaMediaPayload, MediaContext } from './audio-transcription.service';

@Injectable()
export class MediaVisionService {
  private readonly logger = new Logger(MediaVisionService.name);

  /**
   * Analiza una imagen recibida por WhatsApp (comprobante de pago o imagen general) mediante IA Multimodal.
   */
  async analyzeImage(media: WahaMediaPayload, caption?: string, context?: MediaContext): Promise<string> {
    try {
      this.logger.log(`Descargando y analizando imagen visualmente (mimetype: ${media.mimetype || 'image/jpeg'}, session: ${context?.session || 'default'})...`);

      const base64Data = await this.downloadImageBase64(media, context);
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
   * Descarga la imagen y la retorna en string base64.
   */
  private async downloadImageBase64(media: WahaMediaPayload, context?: MediaContext): Promise<string | null> {
    if (media.data) {
      return media.data;
    }

    if (media.url) {
      const { apiUrl, apiKey } = this.resolveWahaConfig(context);
      const resolvedUrl = this.resolveWahaMediaUrl(media.url, apiUrl);
      this.logger.log(`Descargando imagen de WAHA (${context?.session || 'default'}) desde: ${resolvedUrl}`);

      const headers: Record<string, string> = {};
      if (apiKey) headers['X-Api-Key'] = apiKey;

      const response = await fetch(resolvedUrl, { headers });
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
    let model = process.env.AI_VISION_MODEL || process.env.AI_MODEL || 'google/gemini-2.5-flash-lite';

    if (provider === 'gemini') {
      baseUrl = process.env.AI_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta/openai';
      if (!process.env.AI_VISION_MODEL) model = 'gemini-1.5-flash';
    } else if (provider === 'openrouter') {
      baseUrl = process.env.AI_BASE_URL ?? 'https://openrouter.ai/api/v1';
      if (!process.env.AI_VISION_MODEL) model = 'google/gemini-2.5-flash-lite';
    }

    const systemPrompt = `Eres un auditor visual y experto OCR para un CRM y sistema de ventas educativas por WhatsApp.
Analiza con máxima precisión la imagen adjunta y clasifícala estrictamente:

INSTRUCCIONES CLAVE:
1. SI ES UN COMPROBANTE DE PAGO REAL (Nacional o Internacional: Pago Móvil, Transferencia bancaria en cualquier divisa, Zelle, Binance Pay / USDT, PayPal, Zinli, Bancolombia, Nequi, Daviplata, Pix, Yape, Plin, SPEI, OXXO, etc.):
   Solo clasifícalo como comprobante si contiene datos bancarios/financieros visibles. Extrae con fidelidad los datos visibles en este formato exacto:
   "📸 [Comprobante de Pago Detectado]: Banco: {Nombre del banco o plataforma (ej: BDV, Zelle, Binance, Banesco, Bancolombia, Nequi, Zinli, PayPal)} | Referencia: #{Número de referencia, confirmación, hash o ID de transacción} | Monto: {Monto exacto y moneda (ej: 7.250 Bs, $8 USD, 8 USDT, 35.000 COP, etc.)} | Fecha: {Fecha/Hora si es visible}. (Soporte de pago válido)"

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
