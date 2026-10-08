import { Injectable, Logger } from '@nestjs/common';

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  fromName?: string;
}

@Injectable()
export class EmailSenderService {
  private readonly logger = new Logger(EmailSenderService.name);

  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const senderName = options.fromName || process.env.RESEND_FROM_NAME || 'Ingenio AI';

    if (resendApiKey) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${senderName} <${fromEmail}>`,
            to: [options.to],
            subject: options.subject,
            text: options.text,
            html: options.html || (options.text ? `<p>${options.text.replace(/\n/g, '<br/>')}</p>` : undefined),
          }),
        });

        if (!response.ok) {
          const errData = await response.text();
          this.logger.error(`[EmailSender] Error enviando email vía Resend (${response.status}): ${errData}`);
          return { success: false, error: `Resend error ${response.status}: ${errData}` };
        }

        const data: any = await response.json().catch(() => ({}));
        this.logger.log(`[EmailSender] Email enviado exitosamente a ${options.to} (ID: ${data.id})`);
        return { success: true, messageId: data.id };
      } catch (err: any) {
        this.logger.error(`[EmailSender] Excepción en envío Resend: ${err.message}`);
        return { success: false, error: err.message };
      }
    }

    // Si no hay API key configurada todavía, simular o registrar advertencia clara
    this.logger.warn(`[EmailSender] No se detectó RESEND_API_KEY. Configura RESEND_API_KEY en variables de entorno para envío real a ${options.to}.`);
    return {
      success: true,
      messageId: `simulated-email-${Date.now()}`,
    };
  }
}
