import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';

@Injectable()
export class WahaAdapterService {
  private readonly logger = new Logger(WahaAdapterService.name);

  constructor(private readonly prisma: PrismaService) {}

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

    // Strip known garbage suffixes before appending @c.us
    // Some WAHA versions return IDs with trailing 'd' or 'i' characters
    const cleaned = rawId.replace(/[a-zA-Z]+$/, '');

    return `${cleaned}@c.us`;
  }

  async sendMessage(tenantId: string, contactId: string, content: string): Promise<string> {
    const chatId = this.normalizeJid(contactId);
    this.logger.log(`Enviando mensaje vía WAHA a ${chatId} (raw: ${contactId})...`);
    
    const wahaUrl = process.env.WAHA_API_URL;
    if (!wahaUrl) {
      throw new Error('WAHA_API_URL is not configured');
    }
    
    // Buscar wahaSession real
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const session = tenant?.wahaSession || 'default';
    
    const apiKey = process.env.WAHA_API_KEY || '';

    const headers: any = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    if (apiKey) {
      headers['X-Api-Key'] = apiKey;
    }

    try {
      const response = await fetch(`${wahaUrl}/api/sendText`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          chatId: chatId,
          text: content,
          session: session
        })
      });
      
      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        throw new Error(`Waha response con error ${response.status}: ${response.statusText}. Body: ${errBody}`);
      }

      const result = await response.json();
      this.logger.log(`WAHA confirmó el envío. ID: ${result.id || 'N/A'}`);
      
      return result.id || `waha_msg_${Date.now()}`;
    } catch (error) {
      this.logger.error(`Error crítico: ${error.message}`);
      throw error;
    }
  }
}
