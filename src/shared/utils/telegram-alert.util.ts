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

export async function sendTelegramSaleAlert(payload: TelegramSaleAlertPayload): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ALERT_CHAT_ID;

  if (!token || !chatId) {
    console.warn('[TelegramAlert] TELEGRAM_BOT_TOKEN o TELEGRAM_ALERT_CHAT_ID no configurados en variables de entorno.');
    return false;
  }

  let text = '';
  if (payload.isCancellation) {
    text = `⚠️🛑 <b>[VENTA ANULADA / ACCESO REVOCADO]</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📦 <b>Producto:</b> ${payload.productName}\n` +
      `👤 <b>Cliente:</b> ${payload.customerName || 'Cliente'} (${payload.customerPhone || 'N/A'})\n` +
      `⚠️ <b>Motivo:</b> Anulado mediante comando #anular en WhatsApp o CRM.\n` +
      `🔄 <b>Estado:</b> Lead devuelto a WARM y automatizaciones post-venta canceladas.`;
  } else {
    text = `🚨💰 <b>¡NUEVA VENTA REGISTRADA EN EL CRM!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📦 <b>Producto:</b> ${payload.productName}\n` +
      `👤 <b>Cliente:</b> ${payload.customerName || 'Cliente WhatsApp'} (${payload.customerPhone || 'N/A'})\n` +
      `💵 <b>Monto:</b> ${payload.amountFormatted}\n` +
      `🏦 <b>Pago:</b> ${payload.paymentMethod || 'Pago Móvil / Binance'}${payload.reference ? ` (Ref: #${payload.reference})` : ''}\n` +
      `🚀 <b>Estado:</b> ${payload.statusText || 'Acceso entregado automáticamente'}\n` +
      (payload.accessUrl ? `🔗 <b>Enlace entregado:</b> ${payload.accessUrl}\n` : '') +
      `⚖️ <b>Lic. Martín:</b> Sumado al balance financiero del día.\n` +
      `💳 <b>Valentina:</b> Cobro recurrente programado.\n\n` +
      `<i>(Si deseas anular esta venta, responde en WhatsApp con #anular)</i>`;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });
    return res.ok;
  } catch (err: any) {
    console.error('[TelegramAlert] Error enviando alerta:', err.message);
    return false;
  }
}
