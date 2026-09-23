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

/** Sends order text to Telegram. Returns 'bot' | 'share' | 'missing'. */
export function sendTelegram(settings: StoreSettings, text: string): 'bot' | 'share' | 'missing' {
  const token = (settings.botToken || '').trim();
  const chatId = String(settings.chatId || '').trim();

  if (token && chatId) {
    ensureBridge();
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `https://api.telegram.org/bot${token}/sendMessage`;
    form.target = 'tg-bridge';
    form.acceptCharset = 'UTF-8';
    form.style.display = 'none';

    const add = (name: string, value: string) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    };
    add('chat_id', chatId);
    add('text', text.slice(0, 3900));
    add('disable_web_page_preview', 'true');

    document.body.appendChild(form);
    form.submit();
    // Keep form briefly so the browser finishes the navigation request.
    setTimeout(() => form.remove(), 2000);
    return 'bot';
  }

  const user = (settings.telegramUser || '').replace(/^@/, '');
  if (!user) return 'missing';
  const share = `https://t.me/share/url?text=${encodeURIComponent(text)}`;
  window.open(`https://t.me/${user}`, '_blank', 'noopener');
  window.open(share, '_blank', 'noopener');
  return 'share';
}
