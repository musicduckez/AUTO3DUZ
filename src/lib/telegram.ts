import type { Order, Product, StoreSettings } from '../types';
import { formatSom } from './currency';

export function orderMessage(order: Order, products: Product[], lang: 'ru' | 'uz') {
  const lines = order.items.map((it) => {
    const p = products.find((x) => x.id === it.productId);
    const title = p ? p.name[lang] : it.productId;
    return `• ${title} ×${it.qty} — ${formatSom((p?.price ?? 0) * it.qty)}`;
  });
  return [
    `🛒 NEXUS PC · ${order.code}`,
    `${order.name}`,
    `${order.phone} · ${order.telegram}`,
    `${order.city}, ${order.address}`,
    order.comment ? `💬 ${order.comment}` : '',
    '',
    ...lines,
    '',
    `Σ ${formatSom(order.total)}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function ensureBridge() {
  let iframe = document.getElementById('tg-bridge') as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.name = 'tg-bridge';
    iframe.id = 'tg-bridge';
    iframe.title = 'tg';
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
  }
  return iframe;
}

export type TgSendResult = 'bot' | 'share' | 'missing' | 'error';

/**
 * Prefer same-origin Vite proxy (/api/telegram-send).
 * Fallback: iframe GET to Telegram API (may be blocked by some browsers).
 */
export async function sendTelegram(settings: StoreSettings, text: string): Promise<TgSendResult> {
  const token = (settings.botToken || '').trim();
  const chatId = String(settings.chatId || '').trim();
  const payload = text.slice(0, 3900);

  if (token && chatId) {
    try {
      const res = await fetch('/api/telegram-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: token, chatId, text: payload }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
      if (res.ok && data.ok) return 'bot';

      // Fallback if proxy is unavailable (e.g. static preview).
      const iframe = ensureBridge();
      const url =
        `https://api.telegram.org/bot${token}/sendMessage` +
        `?chat_id=${encodeURIComponent(chatId)}` +
        `&text=${encodeURIComponent(payload)}`;
      iframe.src = url;
      console.warn('Telegram proxy failed, used iframe fallback', data.description || res.status);
      return res.ok ? 'bot' : 'error';
    } catch (err) {
      console.error('Telegram send failed', err);
      const iframe = ensureBridge();
      iframe.src =
        `https://api.telegram.org/bot${token}/sendMessage` +
        `?chat_id=${encodeURIComponent(chatId)}` +
        `&text=${encodeURIComponent(payload)}`;
      return 'error';
    }
  }

  const user = (settings.telegramUser || '').replace(/^@/, '');
  if (!user) return 'missing';
  window.open(`https://t.me/${user}`, '_blank', 'noopener');
  window.open(`https://t.me/share/url?text=${encodeURIComponent(payload)}`, '_blank', 'noopener');
  return 'share';
}
