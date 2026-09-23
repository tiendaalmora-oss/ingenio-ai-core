import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { MetaChannelAdapterService } from './meta-channel-adapter.service';

@Injectable()
export class WahaAdapterService {
  private readonly logger = new Logger(WahaAdapterService.name);
  private cachedActiveSession: string | null = null;
  // Cache en memoria para rastrear IDs de mensajes enviados por el sistema (API/bot/CRM)
  // Evita falsos positivos al detectar intervención humana en webhooks salientes (fromMe = true)
  private readonly sentBySystemMessageIds = new Map<string, number>();
  // Cache en memoria por destinatario y contenido para blindaje anti-echo infalible
  private readonly recentOutboundsByTarget = new Map<string, Array<{ textNorm: string; timestamp: number }>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly metaChannelAdapter: MetaChannelAdapterService
  ) {}

  /**
   * Normaliza texto para comparación tolerante a emojis, tildes, saltos y signos.
   */
  private normalizeComparisonText(text: string): string {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Registra un ID de mensaje como enviado por el sistema (bot o CRM dashboard).
   */
  markMessageAsSentBySystem(messageId: any): void {
    if (!messageId) return;
    const idStr = typeof messageId === 'object'
      ? (messageId._serialized || messageId.id || '')
      : String(messageId);
    if (!idStr || idStr === 'waha-msg-ok') return;

    const now = Date.now();
    this.sentBySystemMessageIds.set(idStr, now);

    // Extraer sub-clave (ej: true_58412...@c.us_3EB027... -> 3EB027...)
    const parts = idStr.split('_');
    if (parts.length >= 2) {
      this.sentBySystemMessageIds.set(parts[parts.length - 1], now);
    }
    const rawSuffix = idStr.replace(/^(true|false)_[^_]+_/, '');
    if (rawSuffix) {
      this.sentBySystemMessageIds.set(rawSuffix, now);
    }

    // Purgar entradas antiguas (> 3 minutos) si el caché crece
    if (this.sentBySystemMessageIds.size > 500) {
      for (const [id, ts] of this.sentBySystemMessageIds.entries()) {
        if (now - ts > 180_000) {
          this.sentBySystemMessageIds.delete(id);
        }
      }
    }
  }

  /**
   * Registra el contenido de un mensaje emitido hacia un destinatario para blindaje anti-echo instantáneo.
   */
  markOutboundDispatched(targetChatIdOrPhone: string, content: string): void {
    if (!targetChatIdOrPhone || !content) return;
    const now = Date.now();
    const textNorm = this.normalizeComparisonText(content);
    if (!textNorm) return;

    const digits = targetChatIdOrPhone.replace(/@(c\.us|lid|s\.whatsapp\.net)$/, '').replace(/\D/g, '');
    const keys = new Set<string>();
    if (digits) keys.add(digits);
    if (digits.length >= 10) keys.add(digits.slice(-10));
    keys.add(targetChatIdOrPhone);

    for (const key of keys) {
      const list = this.recentOutboundsByTarget.get(key) || [];
      list.push({ textNorm, timestamp: now });
      const filtered = list.filter((e) => now - e.timestamp < 90_000).slice(-10);
      this.recentOutboundsByTarget.set(key, filtered);
    }

    if (this.recentOutboundsByTarget.size > 500) {
      for (const [k, list] of this.recentOutboundsByTarget.entries()) {
        const active = list.filter((e) => now - e.timestamp < 90_000);
        if (active.length === 0) {
          this.recentOutboundsByTarget.delete(k);
        } else {
          this.recentOutboundsByTarget.set(k, active);
        }
      }
    }
  }

  /**
   * Verifica si un mensaje con contenido similar fue despachado hacia este destinatario en los últimos 75 segundos.
   */
  isSentBySystemContent(targetChatIdOrPhone: string, content: string): boolean {
    if (!targetChatIdOrPhone || !content) return false;
    const now = Date.now();
    const incomingNorm = this.normalizeComparisonText(content);
    if (!incomingNorm) return false;

    const digits = targetChatIdOrPhone.replace(/@(c\.us|lid|s\.whatsapp\.net)$/, '').replace(/\D/g, '');
    const keysToTest = [digits, digits.length >= 10 ? digits.slice(-10) : '', targetChatIdOrPhone].filter(Boolean);

    for (const key of keysToTest) {
      const list = this.recentOutboundsByTarget.get(key);
      if (!list || list.length === 0) continue;

      for (const entry of list) {
        if (now - entry.timestamp > 75_000) continue;
        if (
          entry.textNorm === incomingNorm ||
          entry.textNorm.includes(incomingNorm) ||
          incomingNorm.includes(entry.textNorm) ||
          (entry.textNorm.length > 20 &&
            incomingNorm.length > 20 &&
            entry.textNorm.slice(0, 30) === incomingNorm.slice(0, 30))
        ) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Verifica si un ID de mensaje fue despachado por el sistema.
   */
  isSentBySystem(messageId: any): boolean {
    if (!messageId) return false;
    const idStr = typeof messageId === 'object'
      ? (messageId._serialized || messageId.id || '')
      : String(messageId);
    if (!idStr) return false;
    if (this.sentBySystemMessageIds.has(idStr)) return true;
    const parts = idStr.split('_');
    if (parts.length >= 2 && this.sentBySystemMessageIds.has(parts[parts.length - 1])) {
      return true;
    }
    const rawSuffix = idStr.replace(/^(true|false)_[^_]+_/, '');
    if (rawSuffix && this.sentBySystemMessageIds.has(rawSuffix)) {
      return true;
    }
    return false;
  }

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

    // Respetar intactos los grupos y LIDs explícitos
    if (rawId.includes('@g.us') || rawId.includes('@lid')) {
      return rawId;
    }

    // Extraer solo dígitos
    const cleaned = rawId.replace(/\D/g, '');
    if (!cleaned) return rawId;

    // En WhatsApp Multi-Device, identificadores de 14, 15 o 16 dígitos que no son teléfonos
    // corresponden a LIDs de privacidad generados por Meta. Si venían con @c.us erróneo, se normalizan a @lid.
    if (cleaned.length >= 14 && cleaned.length <= 16) {
      return `${cleaned}@lid`;
    }

    // Si ya contiene @c.us o @s.whatsapp.net legítimo
    if (rawId.includes('@c.us') || rawId.includes('@s.whatsapp.net')) {
      return rawId;
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
    } else if (contactIdOrPhone) {
      // Si ya contiene '@', intentar encontrar el contactId para posibilitar auto-healing
      const cleanDigits = contactIdOrPhone.replace(/\D/g, '');
      const contact = await this.prisma.contact.findFirst({
        where: {
          OR: [
            { externalId: contactIdOrPhone },
            { phone: cleanDigits },
            { phoneNormalized: cleanDigits },
          ],
        },
        select: { id: true },
      });
      if (contact) {
        foundContactId = contact.id;
      }
    }

    const chatId = this.normalizeJid(rawTarget);
    return { chatId, contactId: foundContactId };
  }

  /**
   * Resuelve la configuración de conexión de WAHA (URL y API Key) de acuerdo al tenant y sesión.
   * Aísla la campaña de producción (ferreos / Kits Docentes) en WAHA_PROD_URL y dirige
   * subcuentas y números de prueba a WAHA_SANDBOX_URL.
   */
  resolveWahaConfig(tenantId?: string, sessionName?: string): { apiUrl: string; apiKey: string; isProd: boolean } {
    const isProd =
      tenantId === 'dba1c54c-89c6-41e9-ae9d-03613377a5b3' ||
      sessionName === 'ferreos';

    if (isProd) {
      const rawUrl = process.env.WAHA_PROD_URL || process.env.WAHA_API_URL || 'https://waha.ingeniodigital.shop';
      return {
        apiUrl: rawUrl.replace(/\/+$/, ''),
        apiKey: process.env.WAHA_PROD_API_KEY || process.env.WAHA_API_KEY || '',
        isProd: true,
      };
    }

    // Para subcuentas o instancias de prueba
    const rawUrl = process.env.WAHA_SANDBOX_URL || process.env.WAHA_API_URL || 'https://waha.ingeniodigital.shop';
    return {
      apiUrl: rawUrl.replace(/\/+$/, ''),
      apiKey: process.env.WAHA_SANDBOX_API_KEY || process.env.WAHA_API_KEY || '',
      isProd: false,
    };
  }

  /**
   * Resuelve dinámicamente la sesión activa de WAHA.
   * Evita errores 422 si tenant.wahaSession es nulo o 'default' no existe en WAHA.
   */
  async resolveSession(tenantId?: string): Promise<string> {
    if (tenantId) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { wahaSession: true },
      });
      if (tenant?.wahaSession) {
        return tenant.wahaSession;
      }
    }

    if (process.env.WAHA_SESSION) {
      return process.env.WAHA_SESSION;
    }

    // Buscar prioritariamente la sesión de producción principal (ferreos / Kits Docentes)
    const prodTenant = await this.prisma.tenant.findFirst({
      where: {
        OR: [
          { id: 'dba1c54c-89c6-41e9-ae9d-03613377a5b3' },
          { wahaSession: 'ferreos' }
        ]
      },
      select: { wahaSession: true },
    });
    if (prodTenant?.wahaSession) {
      return prodTenant.wahaSession;
    }

    if (this.cachedActiveSession) {
      return this.cachedActiveSession;
    }

    // Auto-descubrimiento en tiempo de ejecución consultando WAHA prod
    try {
      const sessions = await this.getWahaSessions('prod');
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

    return 'ferreos';
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

    // 2. Reintento a @lid si falló con @c.us
    if ((!response || !response.ok) && currentChatId.endsWith('@c.us')) {
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
      const session = await this.resolveSession(tenantId);
      const config = this.resolveWahaConfig(tenantId, session);
      if (!config.apiUrl) return;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };
      if (config.apiKey) headers['X-Api-Key'] = config.apiKey;

      const target = await this.resolveTargetChatId(contactIdOrPhone);
      const chatId = target.chatId;

      this.logger.log(`[WAHA] Solicitando estado "Escribiendo..." para ${chatId} (sesión: ${session}, host: ${config.apiUrl})`);

      const result = await this.executeTypingWithRetry(config.apiUrl, session, chatId, headers, true);
      if (result.success && result.usedChatId !== chatId && target.contactId) {
        await this.healContactExternalId(target.contactId, result.usedChatId);
      }
    } catch (err: any) {
      this.logger.warn(`[WAHA] Excepción no crítica en startTyping: ${err.message}`);
    }
  }

  async stopTyping(tenantId: string, contactIdOrPhone: string): Promise<void> {
    try {
      const session = await this.resolveSession(tenantId);
      const config = this.resolveWahaConfig(tenantId, session);
      if (!config.apiUrl) return;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };
      if (config.apiKey) headers['X-Api-Key'] = config.apiKey;

      const target = await this.resolveTargetChatId(contactIdOrPhone);
      const chatId = target.chatId;

      await this.executeTypingWithRetry(config.apiUrl, session, chatId, headers, false);
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

    const session = await this.resolveSession(tenantId);
    const config = this.resolveWahaConfig(tenantId, session);
    if (!config.apiUrl) {
      throw new Error('WAHA API URL is not configured');
    }

    this.logger.log(`Enviando mensaje vía WAHA [${config.isProd ? 'PROD' : 'SANDBOX'}] (${config.apiUrl}) a ${chatId} (ref: ${contactIdOrPhone})...`);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (config.apiKey) {
      headers['X-Api-Key'] = config.apiKey;
    }

    // Blindaje anti-echo inmediato: Registrar destino y contenido antes de invocar la red
    this.markOutboundDispatched(chatId, content);
    if (contactIdOrPhone && contactIdOrPhone !== chatId) {
      this.markOutboundDispatched(contactIdOrPhone, content);
    }

    try {
      let response = await fetch(`${config.apiUrl}/api/sendText`, {
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

      // Reintento 1: Si falló con @c.us, reintentar con @lid y auto-curar
      if (!response.ok && chatId.endsWith('@c.us')) {
        const lidChatId = chatId.replace('@c.us', '@lid');
        this.logger.warn(`[WAHA] Envío falló con @c.us (${response.status}). Reintentando con ${lidChatId}...`);
        chatId = lidChatId;
        this.markOutboundDispatched(lidChatId, content);
        response = await fetch(`${config.apiUrl}/api/sendText`, {
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

      // Reintento 2: Si falló con @lid, reintentar con @c.us y auto-curar
      if (!response.ok && chatId.endsWith('@lid')) {
        const cusChatId = chatId.replace('@lid', '@c.us');
        this.logger.warn(`[WAHA] Envío falló con @lid (${response.status}). Reintentando con ${cusChatId}...`);
        chatId = cusChatId;
        this.markOutboundDispatched(cusChatId, content);
        response = await fetch(`${config.apiUrl}/api/sendText`, {
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

      if (!response.ok) {
        throw new Error(`Waha response con error ${response.status}: ${response.statusText}. Body: ${errBody}`);
      }

      const result = await response.json().catch(() => ({}));
      const rawId = result?.id?._serialized || result?.id || result?.key?.id || result?._data?.id?._serialized || 'waha-msg-ok';
      const messageId = typeof rawId === 'object' ? (rawId._serialized || rawId.id || 'waha-msg-ok') : String(rawId);
      if (messageId && messageId !== 'waha-msg-ok') {
        this.markMessageAsSentBySystem(messageId);
      }
      this.logger.log(`Mensaje entregado exitosamente a WAHA. MessageId: ${messageId}`);
      return messageId;
    } catch (err: any) {
      this.logger.error(`Excepción comunicando con WAHA para ${chatId}: ${err.message}`);
      throw err;
    }
  }

  /**
   * Consulta las sesiones activas en WAHA para diagnóstico (soporta prod, sandbox o all).
   */
  async getWahaSessions(target: 'prod' | 'sandbox' | 'all' = 'prod'): Promise<any> {
    const prodConfig = this.resolveWahaConfig('dba1c54c-89c6-41e9-ae9d-03613377a5b3', 'ferreos');
    const sandboxConfig = this.resolveWahaConfig('subaccount-test', 'sub_sandbox');

    const fetchSessions = async (config: { apiUrl: string; apiKey: string }) => {
      if (!config.apiUrl) return { error: 'WAHA URL no configurado' };
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (config.apiKey) headers['X-Api-Key'] = config.apiKey;
      try {
        const response = await fetch(`${config.apiUrl}/api/sessions?all=true`, {
          headers,
          signal: AbortSignal.timeout(4000),
        });
        if (!response.ok) {
          return { status: response.status, error: await response.text() };
        }
        return await response.json();
      } catch (e: any) {
        return { error: e.message };
      }
    };

    if (target === 'all') {
      const [prod, sandbox] = await Promise.all([
        fetchSessions(prodConfig),
        fetchSessions(sandboxConfig),
      ]);
      return { prod, sandbox };
    }

    if (target === 'sandbox') {
      return fetchSessions(sandboxConfig);
    }

    return fetchSessions(prodConfig);
  }
}
