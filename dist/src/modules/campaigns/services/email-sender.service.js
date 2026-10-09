"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var EmailSenderService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailSenderService = void 0;
const common_1 = require("@nestjs/common");
let EmailSenderService = EmailSenderService_1 = class EmailSenderService {
    logger = new common_1.Logger(EmailSenderService_1.name);
    async sendEmail(options) {
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
                const data = await response.json().catch(() => ({}));
                this.logger.log(`[EmailSender] Email enviado exitosamente a ${options.to} (ID: ${data.id})`);
                return { success: true, messageId: data.id };
            }
            catch (err) {
                this.logger.error(`[EmailSender] Excepción en envío Resend: ${err.message}`);
                return { success: false, error: err.message };
            }
        }
        this.logger.warn(`[EmailSender] No se detectó RESEND_API_KEY. Configura RESEND_API_KEY en variables de entorno para envío real a ${options.to}.`);
        return {
            success: true,
            messageId: `simulated-email-${Date.now()}`,
        };
    }
};
exports.EmailSenderService = EmailSenderService;
exports.EmailSenderService = EmailSenderService = EmailSenderService_1 = __decorate([
    (0, common_1.Injectable)()
], EmailSenderService);
//# sourceMappingURL=email-sender.service.js.map