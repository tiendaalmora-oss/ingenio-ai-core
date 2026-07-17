import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';

@Injectable()
export class WahaAdapterService {
  private readonly logger = new Logger(WahaAdapterService.name);

  constructor(private readonly prisma: PrismaService) {}

  async sendMessage(tenantId: string, contactId: string, content: string): Promise<string> {
    this.logger.log(`Enviando mensaje vía WAHA a ${contactId}...`);
    
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
          chatId: contactId,
          text: content,
          session: session
        })
      });
      
      if (!response.ok) {
        throw new Error(`WAHA respondió con error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      this.logger.log(`WAHA confirmó el envío. ID: ${result.id || 'N/A'}`);
      
      return result.id || `waha_msg_${Date.now()}`;
    } catch (error) {
      this.logger.error(`Error de conexión con WAHA: ${error.message}`);
      throw error;
    }
  }
}
