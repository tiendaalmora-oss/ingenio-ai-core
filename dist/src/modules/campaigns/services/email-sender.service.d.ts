export interface SendEmailOptions {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    fromName?: string;
}
export declare class EmailSenderService {
    private readonly logger;
    sendEmail(options: SendEmailOptions): Promise<{
        success: boolean;
        messageId?: string;
        error?: string;
    }>;
}
