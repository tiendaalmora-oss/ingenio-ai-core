import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MetaChannelAdapterService {
  private readonly logger = new Logger(MetaChannelAdapterService.name);

  async sendMessage(recipientId: string, text: string): Promise<string> {
    const cleanRecipientId = recipientId.replace(/^(ig_|instagram_|fb_|messenger_)/, '');
    const accessToken = process.env.META_PAGE_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || '';

    if (!accessToken) {
      this.logger.warn(`META_PAGE_ACCESS_TOKEN no está configurado. No se pudo enviar mensaje a ${recipientId}`);
      return 'meta-mock-id';
    }

    try {
      const response = await fetch(`https://graph.facebook.com/v20.0/me/messages?access_token=${accessToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: cleanRecipientId },
          message: { text }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`Error enviando mensaje a Meta (Instagram/FB) (${response.status}): ${errText}`);
        throw new Error(`Meta API error: ${errText}`);
      }

      const data: any = await response.json();
      this.logger.log(`Mensaje enviado con éxito por Meta (Instagram/FB) a ${cleanRecipientId}: ${data.message_id || data.recipient_id}`);
      return data.message_id || 'meta-msg-ok';
    } catch (err: any) {
      this.logger.error(`Excepción enviando mensaje por Meta a ${recipientId}: ${err.message}`);
      throw err;
    }
  }
}
