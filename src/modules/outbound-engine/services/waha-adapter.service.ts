import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { MetaChannelAdapterService } from './meta-channel-adapter.service';

@Injectable()
export class WahaAdapterService {
  private readonly logger = new Logger(WahaAdapterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metaChannelAdapter: MetaChannelAdapterService
  ) {}

  /**
   * Normalizes a raw phone/externalId into a valid WhatsApp JID.
   * Examples:
   *   "5491168836460"            → "5491168836460@c.us"
   *   "5491168836460@c.us"       → "5491168836460@c.us"  (unchanged)
   *   "120363424203726380@g.us"  → "120363424203726380@g.us" (group, unchanged)
   *   "254635793186037116d"      → "254635793186037116@c.us" (strips trailing 'd')
   */
  private normalizeJid(rawId: string): string {
    if (!rawId) return rawId;

    // Already a valid JID — leave untouched
    if (rawId.includes('@c.us') || rawId.includes('@g.us') || rawId.includes('@lid')) {
      return rawId;
    }

    // Strip non-digit characters (+, spaces, dashes, dots)
    const cleaned = rawId.replace(/\D/g, '');

    return `${cleaned}@c.us`;
  }

  async sendMessage(tenantId: string, contactIdOrPhone: string, content: string): Promise<string> {
    let rawPhone = contactIdOrPhone;

    // Si contactIdOrPhone es un ID de Instagram o Facebook Messenger, enviar vía Meta API
    if (rawPhone && (rawPhone.startsWith('ig_') || rawPhone.startsWith('instagram_') || rawPhone.startsWith('fb_') || rawPhone.startsWith('messenger_'))) {
      this.logger.log(`Enrutando mensaje omnicanal hacia Meta (Instagram/FB): ${rawPhone}`);
      return this.metaChannelAdapter.sendMessage(rawPhone, content);
    }

    // Si contactIdOrPhone es un ID de Contacto de base de datos o UUID, resolvemos el contacto
    if (contactIdOrPhone && !contactIdOrPhone.includes('@')) {
      const contact = await this.prisma.contact.findFirst({
        where: {
          OR: [
            { id: contactIdOrPhone },
            { externalId: contactIdOrPhone },
            { phone: contactIdOrPhone },
            { phoneNormalized: contactIdOrPhone }
          ]
        }
      });
      if (contact) {
        // Priorizar externalId que contiene el JID exacto original (@lid o @c.us)
        rawPhone = contact.externalId || contact.phone || contact.phoneNormalized || contactIdOrPhone;
      }
    }

    let chatId = this.normalizeJid(rawPhone);
    this.logger.log(`Enviando mensaje vía WAHA a ${chatId} (teléfono/ref: ${rawPhone}, id: ${contactIdOrPhone})...`);
    
    const wahaUrl = process.env.WAHA_API_URL;
    if (!wahaUrl) {
      throw new Error('WAHA_API_URL is not configured');
    }
    
    // Buscar wahaSession real (prioriza variable de entorno WAHA_SESSION)
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const session = process.env.WAHA_SESSION || tenant?.wahaSession || 'default';
    
    const apiKey = process.env.WAHA_API_KEY || '';

    const headers: any = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    if (apiKey) {
      headers['X-Api-Key'] = apiKey;
    }

    try {
      let response = await fetch(`${wahaUrl}/api/sendText`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          chatId: chatId,
          text: content,
          session: session
        })
      });
      
      let errBody = '';
      if (!response.ok) {
        errBody = await response.text().catch(() => '');
      }

      // Reintento 1: Si falló por "No LID for user" con @c.us, reintentar con @lid
      if (!response.ok && errBody.includes('No LID for user') && chatId.endsWith('@c.us')) {
        const lidChatId = chatId.replace('@c.us', '@lid');
        this.logger.warn(`Detectado error "No LID for user". Reintentando entrega a ${lidChatId}...`);
        chatId = lidChatId;
        response = await fetch(`${wahaUrl}/api/sendText`, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            chatId: lidChatId,
            text: content,
            session: session
          })
        });
        if (!response.ok) errBody = await response.text().catch(() => '');
      }

      // Reintento 2: Si falló por sesión no encontrada y no era 'default', reintentar con 'default'
      if (!response.ok && session !== 'default') {
        this.logger.warn(`Envío falló con sesión "${session}". Reintentando con sesión "default"...`);
        
        response = await fetch(`${wahaUrl}/api/sendText`, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            chatId: chatId,
            text: content,
            session: 'default'
          })
        });
        if (!response.ok) errBody = await response.text().catch(() => '');
      }

      if (!response.ok) {
        throw new Error(`Waha response con error ${response.status}: ${response.statusText}. Body: ${errBody}`);
      }

      const result = await response.json();
      this.logger.log(`Mensaje entregado exitosamente a WAHA. MessageId: ${result.id || result.key?.id || 'ok'}`);
      return result.id || result.key?.id || 'waha-msg-ok';
    } catch (err: any) {
      this.logger.error(`Excepción comunicando con WAHA para ${chatId}: ${err.message}`);
      throw err;
    }
  }

  async startTyping(tenantId: string, contactIdOrPhone: string): Promise<void> {
    try {
      const wahaUrl = process.env.WAHA_API_URL;
      if (!wahaUrl) return;
      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
      const session = process.env.WAHA_SESSION || tenant?.wahaSession || 'default';
      const apiKey = process.env.WAHA_API_KEY || '';
      const chatId = this.normalizeJid(contactIdOrPhone);
      const headers: any = { 'Content-Type': 'application/json' };
      if (apiKey) headers['X-Api-Key'] = apiKey;

      await fetch(`${wahaUrl}/api/startTyping`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ chatId, session })
      }).catch(() => {});
    } catch {}
  }

  async stopTyping(tenantId: string, contactIdOrPhone: string): Promise<void> {
    try {
      const wahaUrl = process.env.WAHA_API_URL;
      if (!wahaUrl) return;
      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
      const session = process.env.WAHA_SESSION || tenant?.wahaSession || 'default';
      const apiKey = process.env.WAHA_API_KEY || '';
      const chatId = this.normalizeJid(contactIdOrPhone);
      const headers: any = { 'Content-Type': 'application/json' };
      if (apiKey) headers['X-Api-Key'] = apiKey;

      await fetch(`${wahaUrl}/api/stopTyping`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ chatId, session })
      }).catch(() => {});
    } catch {}
  }

  /**
   * Consulta las sesiones activas en WAHA para diagnóstico
   */
  async getWahaSessions(): Promise<any> {
    const wahaUrl = process.env.WAHA_API_URL;
    if (!wahaUrl) return { error: 'WAHA_API_URL no configurado' };

    const apiKey = process.env.WAHA_API_KEY || '';
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (apiKey) headers['X-Api-Key'] = apiKey;

    try {
      const response = await fetch(`${wahaUrl}/api/sessions?all=true`, { headers });
      if (!response.ok) {
        return { status: response.status, error: await response.text() };
      }
      return await response.json();
    } catch (e: any) {
      return { error: e.message };
    }
  }
}
