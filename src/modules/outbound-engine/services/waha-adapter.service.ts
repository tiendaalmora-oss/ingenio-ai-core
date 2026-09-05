import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { MetaChannelAdapterService } from './meta-channel-adapter.service';

@Injectable()
export class WahaAdapterService {
  private readonly logger = new Logger(WahaAdapterService.name);
  private cachedActiveSession: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly metaChannelAdapter: MetaChannelAdapterService
  ) {}

  /**
   * Normaliza un identificador / teléfono / LID en un JID válido de WhatsApp.
   * Ejemplos:
   *   "163810052673674@lid"       → "163810052673674@lid" (LID intacto)
   *   "584121234567@c.us"         → "584121234567@c.us" (teléfono intacto)
   *   "120363424203726380@g.us"   → "120363424203726380@g.us" (grupo intacto)
   *   "163810052673674" (15 dig)  → "163810052673674@lid" (detectado como WhatsApp Privacy LID)
   *   "584121234567" (12 dig)     → "584121234567@c.us" (detectado como teléfono estándar)
   */
  normalizeJid(rawId: string): string {
    if (!rawId) return rawId;

    // Si ya contiene sufijo de dominio WhatsApp, respetar intacto
    if (
      rawId.includes('@c.us') ||
      rawId.includes('@g.us') ||
      rawId.includes('@lid') ||
      rawId.includes('@s.whatsapp.net')
    ) {
      return rawId;
    }

    // Extraer solo dígitos
    const cleaned = rawId.replace(/\D/g, '');
    if (!cleaned) return rawId;

    // En WhatsApp Multi-Device, identificadores de 14 o 15 dígitos que no son teléfonos
    // corresponden a LIDs de privacidad generados por Meta
    if (cleaned.length === 14 || cleaned.length === 15) {
      return `${cleaned}@lid`;
    }

    return `${cleaned}@c.us`;
  }

  /**
   * Resuelve de forma unificada el contacto y su chatId/JID de WhatsApp a partir
   * de un UUID de contacto, un teléfono o un JID raw.
   */
  async resolveTargetChatId(contactIdOrPhone: string): Promise<{ chatId: string; contactId?: string }> {
    let rawTarget = contactIdOrPhone;
    let foundContactId: string | undefined;

    // Si no contiene '@', verificar si es un UUID o referencia de Contact en base de datos
    if (contactIdOrPhone && !contactIdOrPhone.includes('@')) {
      const contact = await this.prisma.contact.findFirst({
        where: {
          OR: [
            { id: contactIdOrPhone },
            { externalId: contactIdOrPhone },
            { phone: contactIdOrPhone },
            { phoneNormalized: contactIdOrPhone },
          ],
        },
        select: { id: true, externalId: true, phone: true, phoneNormalized: true },
      });

      if (contact) {
        foundContactId = contact.id;
        // Priorizar externalId que contiene el JID exacto original (@lid o @c.us)
        rawTarget = contact.externalId || contact.phone || contact.phoneNormalized || contactIdOrPhone;
      }
    }

    const chatId = this.normalizeJid(rawTarget);
    return { chatId, contactId: foundContactId };
  }

  /**
   * Resuelve dinámicamente la sesión activa de WAHA.
   * Evita errores 422 si tenant.wahaSession es nulo o 'default' no existe en WAHA.
   */
  async resolveSession(tenantId?: string): Promise<string> {
    if (process.env.WAHA_SESSION) {
      return process.env.WAHA_SESSION;
    }

    if (tenantId) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { wahaSession: true },
      });
      if (tenant?.wahaSession) {
        return tenant.wahaSession;
      }
    }

    // Buscar si algún tenant tiene sesión configurada (ej: ferreos)
    const tenantWithSession = await this.prisma.tenant.findFirst({
      where: { wahaSession: { not: null } },
      select: { wahaSession: true },
    });
    if (tenantWithSession?.wahaSession) {
      return tenantWithSession.wahaSession;
    }

    if (this.cachedActiveSession) {
      return this.cachedActiveSession;
    }

    // Auto-descubrimiento en tiempo de ejecución consultando WAHA
    try {
      const sessions = await this.getWahaSessions();
      if (Array.isArray(sessions) && sessions.length > 0) {
        const working =
          sessions.find((s: any) => s.status === 'WORKING' || s.status === 'CONNECTED' || s.status === 'STARTING') ||
          sessions[0];
        if (working?.name) {
          this.cachedActiveSession = working.name;
          this.logger.log(`[WAHA] Sesión descubierta dinámicamente: "${working.name}"`);
          return working.name;
        }
      }
    } catch {
      /* fallback */
    }

    return 'default';
  }

  /**
   * Auto-cura el externalId del contacto en la base de datos tras verificar
   * el canal/JID exitoso en WAHA (ej: convirtiendo @c.us erróneo en @lid válido).
   */
  private async healContactExternalId(contactId?: string, verifiedJid?: string): Promise<void> {
    if (!contactId || !verifiedJid) return;
    try {
      await this.prisma.contact.update({
        where: { id: contactId },
        data: { externalId: verifiedJid },
      });
      this.logger.log(`[Auto-Heal] Contacto ${contactId} auto-reparado con JID verificado: ${verifiedJid}`);
    } catch (e: any) {
      this.logger.debug(`[Auto-Heal] No se pudo actualizar contact ${contactId}: ${e.message}`);
    }
  }

  /**
   * Ejecuta peticiones de presencia (startTyping / stopTyping) con reintento bidireccional
   * (@c.us <-> @lid) ante errores "No LID for user".
   */
  private async executeTypingWithRetry(
    wahaUrl: string,
    session: string,
    initialChatId: string,
    headers: Record<string, string>,
    isStart: boolean
  ): Promise<{ success: boolean; usedChatId: string }> {
    let currentChatId = initialChatId;
    const endpoint = isStart ? '/api/startTyping' : '/api/stopTyping';
    const presence = isStart ? 'typing' : 'paused';

    // 1. Intento inicial
    let response = await fetch(`${wahaUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ chatId: currentChatId, session }),
      signal: AbortSignal.timeout(4000),
    }).catch((e) => {
      this.logger.warn(`[WAHA] Falló llamada a ${endpoint}: ${e.message}`);
      return null;
    });

    let errText = '';
    if (response && !response.ok) {
      errText = await response.text().catch(() => '');
    }

    // 2. Reintento a @lid si falló por "No LID for user" con @c.us
    if (
      (!response || !response.ok) &&
      (errText.includes('No LID for user') || !response?.ok) &&
      currentChatId.endsWith('@c.us')
    ) {
      const lidChatId = currentChatId.replace('@c.us', '@lid');
      this.logger.warn(`[WAHA ${endpoint}] Error con @c.us. Reintentando con ${lidChatId}...`);

      const retryRes = await fetch(`${wahaUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ chatId: lidChatId, session }),
        signal: AbortSignal.timeout(4000),
      }).catch(() => null);

      if (retryRes && retryRes.ok) {
        if (isStart) this.logger.log(`[WAHA] Estado "Escribiendo..." activado exitosamente para ${lidChatId}`);
        return { success: true, usedChatId: lidChatId };
      }
    }

    // 3. Reintento a @c.us si falló con @lid
    if ((!response || !response.ok) && currentChatId.endsWith('@lid')) {
      const cusChatId = currentChatId.replace('@lid', '@c.us');
      const retryRes = await fetch(`${wahaUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ chatId: cusChatId, session }),
        signal: AbortSignal.timeout(4000),
      }).catch(() => null);

      if (retryRes && retryRes.ok) {
        if (isStart) this.logger.log(`[WAHA] Estado "Escribiendo..." activado exitosamente para ${cusChatId}`);
        return { success: true, usedChatId: cusChatId };
      }
    }

    // 4. Fallback a endpoint de presencia multi-sesión /api/{session}/presence
    if (!response || !response.ok) {
      const presRes = await fetch(`${wahaUrl}/api/${session}/presence`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ chatId: currentChatId, presence }),
        signal: AbortSignal.timeout(4000),
      }).catch(() => null);

      if (presRes && presRes.ok) {
        return { success: true, usedChatId: currentChatId };
      }
    }

    if (response && response.ok) {
      if (isStart) this.logger.log(`[WAHA] Estado "Escribiendo..." activado exitosamente para ${currentChatId}`);
      return { success: true, usedChatId: currentChatId };
    }

    return { success: false, usedChatId: currentChatId };
  }

  async startTyping(tenantId: string, contactIdOrPhone: string): Promise<void> {
    try {
      const wahaUrl = process.env.WAHA_API_URL;
      if (!wahaUrl) return;

      const session = await this.resolveSession(tenantId);
      const apiKey = process.env.WAHA_API_KEY || '';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };
      if (apiKey) headers['X-Api-Key'] = apiKey;

      const target = await this.resolveTargetChatId(contactIdOrPhone);
      const chatId = target.chatId;

      this.logger.log(`[WAHA] Solicitando estado "Escribiendo..." para ${chatId} (sesión: ${session})`);

      const result = await this.executeTypingWithRetry(wahaUrl, session, chatId, headers, true);
      if (result.success && result.usedChatId !== chatId && target.contactId) {
        await this.healContactExternalId(target.contactId, result.usedChatId);
      }
    } catch (err: any) {
      this.logger.warn(`[WAHA] Excepción no crítica en startTyping: ${err.message}`);
    }
  }

  async stopTyping(tenantId: string, contactIdOrPhone: string): Promise<void> {
    try {
      const wahaUrl = process.env.WAHA_API_URL;
      if (!wahaUrl) return;

      const session = await this.resolveSession(tenantId);
      const apiKey = process.env.WAHA_API_KEY || '';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };
      if (apiKey) headers['X-Api-Key'] = apiKey;

      const target = await this.resolveTargetChatId(contactIdOrPhone);
      const chatId = target.chatId;

      await this.executeTypingWithRetry(wahaUrl, session, chatId, headers, false);
    } catch {
      /* silencioso */
    }
  }

  async sendMessage(tenantId: string, contactIdOrPhone: string, content: string): Promise<string> {
    let rawPhone = contactIdOrPhone;

    // Si contactIdOrPhone es un ID de Instagram o Facebook Messenger, enviar vía Meta API
    if (
      rawPhone &&
      (rawPhone.startsWith('ig_') ||
        rawPhone.startsWith('instagram_') ||
        rawPhone.startsWith('fb_') ||
        rawPhone.startsWith('messenger_'))
    ) {
      this.logger.log(`Enrutando mensaje omnicanal hacia Meta (Instagram/FB): ${rawPhone}`);
      return this.metaChannelAdapter.sendMessage(rawPhone, content);
    }

    const target = await this.resolveTargetChatId(contactIdOrPhone);
    let chatId = target.chatId;

    this.logger.log(`Enviando mensaje vía WAHA a ${chatId} (ref: ${contactIdOrPhone})...`);

    const wahaUrl = process.env.WAHA_API_URL;
    if (!wahaUrl) {
      throw new Error('WAHA_API_URL is not configured');
    }

    const session = await this.resolveSession(tenantId);
    const apiKey = process.env.WAHA_API_KEY || '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
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
          session: session,
        }),
      });

      let errBody = '';
      if (!response.ok) {
        errBody = await response.text().catch(() => '');
      }

      // Reintento 1: Si falló por "No LID for user" con @c.us, reintentar con @lid y auto-curar
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
            session: session,
          }),
        });
        if (response.ok && target.contactId) {
          await this.healContactExternalId(target.contactId, lidChatId);
        }
        if (!response.ok) errBody = await response.text().catch(() => '');
      }

      // Reintento 2: Si falló con @lid, reintentar con @c.us
      if (!response.ok && chatId.endsWith('@lid')) {
        const cusChatId = chatId.replace('@lid', '@c.us');
        this.logger.warn(`Envío falló con @lid. Reintentando con ${cusChatId}...`);
        chatId = cusChatId;
        response = await fetch(`${wahaUrl}/api/sendText`, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            chatId: cusChatId,
            text: content,
            session: session,
          }),
        });
        if (response.ok && target.contactId) {
          await this.healContactExternalId(target.contactId, cusChatId);
        }
        if (!response.ok) errBody = await response.text().catch(() => '');
      }

      // Reintento 3: Si falló por sesión no encontrada y no era 'default', reintentar con 'default'
      if (!response.ok && session !== 'default') {
        this.logger.warn(`Envío falló con sesión "${session}". Reintentando con sesión "default"...`);

        response = await fetch(`${wahaUrl}/api/sendText`, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            chatId: chatId,
            text: content,
            session: 'default',
          }),
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

  /**
   * Consulta las sesiones activas en WAHA para diagnóstico
   */
  async getWahaSessions(): Promise<any> {
    const wahaUrl = process.env.WAHA_API_URL;
    if (!wahaUrl) return { error: 'WAHA_API_URL no configurado' };

    const apiKey = process.env.WAHA_API_KEY || '';
    const headers: Record<string, string> = { Accept: 'application/json' };
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
