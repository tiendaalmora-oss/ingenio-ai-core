export interface TelegramSaleAlertPayload {
    productName: string;
    customerName?: string;
    customerPhone?: string;
    amountFormatted: string;
    paymentMethod?: string;
    reference?: string;
    statusText?: string;
    accessUrl?: string;
    isCancellation?: boolean;
}
export declare function sendTelegramSaleAlert(payload: TelegramSaleAlertPayload): Promise<boolean>;
