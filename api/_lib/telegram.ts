export async function sendTelegramMessage(text: string) {
  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const chatId = String(process.env.TELEGRAM_CHAT_ID || '').trim();
  if (!token || !chatId) {
    return { ok: false as const, description: 'TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID missing' };
  }
  const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text.slice(0, 3900),
      disable_web_page_preview: true,
    }),
  });
  const data = (await tg.json()) as { ok?: boolean; description?: string; result?: { message_id?: number } };
  return data;
}

export async function sendTelegramPhoto(payload: {
  caption: string;
  fileName: string;
  dataUrl: string;
}) {
  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const chatId = String(process.env.TELEGRAM_CHAT_ID || '').trim();
  if (!token || !chatId) {
    return { ok: false as const, description: 'TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID missing' };
  }
  const match = /^data:([^;]+);base64,(.+)$/s.exec(payload.dataUrl);
  if (!match) return { ok: false as const, description: 'invalid dataUrl' };

  const mime = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 8_000_000) return { ok: false as const, description: 'file too large (max 8MB)' };

  const form = new FormData();
  form.append('chat_id', chatId);
  if (payload.caption) form.append('caption', payload.caption.slice(0, 900));
  const blob = new Blob([new Uint8Array(buffer)], { type: mime });
  const isImage = mime.startsWith('image/');
  form.append(isImage ? 'photo' : 'document', blob, payload.fileName || 'receipt.jpg');

  const endpoint = isImage ? 'sendPhoto' : 'sendDocument';
  const tg = await fetch(`https://api.telegram.org/bot${token}/${endpoint}`, {
    method: 'POST',
    body: form,
  });
  return (await tg.json()) as { ok?: boolean; description?: string };
}

export function formatOrderMessage(order: {
  code: string;
  name: string;
  phone: string;
  telegram: string;
  city: string;
  address: string;
  comment?: string;
  total: number;
  items: Array<{ productId: string; qty: number; title?: string; price?: number }>;
}) {
  const lines = order.items.map((it) => {
    const title = it.title || it.productId;
    const sum = (it.price ?? 0) * it.qty;
    return `• ${title} ×${it.qty}${sum ? ` — ${sum.toLocaleString('ru-RU')} so'm` : ''}`;
  });
  return [
    `🛒 NEXUS PC · ${order.code}`,
    order.name,
    `${order.phone} · ${order.telegram}`,
    `${order.city}, ${order.address}`,
    order.comment ? `💬 ${order.comment}` : '',
    '',
    ...lines,
    '',
    `Σ ${order.total.toLocaleString('ru-RU')} so'm`,
    '',
    '💳 Ждёт оплату на карту. Клиент загрузит чек в трекинге.',
  ]
    .filter(Boolean)
    .join('\n');
}
