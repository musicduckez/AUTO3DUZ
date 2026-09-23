import type { Order, Product, StoreSettings } from '../types';
import { formatSom } from './currency';

export function orderMessage(order: Order, products: Product[], lang: 'ru' | 'uz') {
  const lines = order.items.map((it) => {
    const p = products.find((x) => x.id === it.productId);
    const title = p ? p.name[lang] : it.productId;
    return `• ${title} ×${it.qty} — ${formatSom((p?.price ?? 0) * it.qty)}`;
  });
  return [
    `NEXUS PC · ${order.code}`,
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

export function sendTelegram(settings: StoreSettings, text: string) {
  if (settings.botToken && settings.chatId) {
    const iframe = document.getElementById('tg-bridge') as HTMLIFrameElement | null;
    const form = document.createElement('form');
    form.method = 'GET';
    form.action = `https://api.telegram.org/bot${settings.botToken}/sendMessage`;
    form.target = iframe?.name || 'tg-bridge';
    form.style.display = 'none';
    const add = (name: string, value: string) => {
      const input = document.createElement('input');
      input.name = name;
      input.value = value;
      form.appendChild(input);
    };
    add('chat_id', settings.chatId);
    add('text', text);
    document.body.appendChild(form);
    form.submit();
    form.remove();
    return 'bot';
  }
  const user = settings.telegramUser.replace(/^@/, '');
  if (user) {
    window.open(`https://t.me/${user}`, '_blank');
  }
  window.open(`https://t.me/share/url?text=${encodeURIComponent(text)}`, '_blank');
  return 'share';
}
