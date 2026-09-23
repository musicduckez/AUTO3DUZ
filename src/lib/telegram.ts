import type { Order, Product, StoreSettings } from '../types';
import { formatSom } from './currency';

/** Hardcoded demo credentials — always used as fallback so orders reach the bot. */
const TG_TOKEN = '8911484992:AAEXEtySUph28YSA0OhdxFXQrbPrRlZGb7Y';
const TG_CHAT = '1263687877';

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

export type TgSendResult = {
  status: 'bot' | 'share' | 'missing' | 'error';
  detail?: string;
};

async function postViaProxy(token: string, chatId: string, text: string) {
  const endpoint = `${window.location.origin}/api/telegram-send`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ botToken: token, chatId, text }),
  });
  const raw = await res.text();
  let data: { ok?: boolean; description?: string; result?: { message_id?: number } } = {};
  try {
    data = JSON.parse(raw);
  } catch {
    return {
      ok: false as const,
      detail: `Прокси вернул не JSON (HTTP ${res.status}). Перезапустите npm run dev.`,
    };
  }
  if (res.ok && data.ok) {
    return { ok: true as const, detail: `message_id=${data.result?.message_id ?? '?'}` };
  }
  return {
    ok: false as const,
    detail: data.description || `HTTP ${res.status}: ${raw.slice(0, 120)}`,
  };
}

/**
 * Sends order to Telegram via same-origin Vite proxy.
 * Always falls back to built-in bot token + chat id.
 */
export async function sendTelegram(settings: StoreSettings, text: string): Promise<TgSendResult> {
  const payload = text.slice(0, 3900);
  const attempts: Array<{ token: string; chatId: string; label: string }> = [
    {
      token: (settings.botToken || '').trim() || TG_TOKEN,
      chatId: String(settings.chatId || '').trim() || TG_CHAT,
      label: 'settings',
    },
    { token: TG_TOKEN, chatId: TG_CHAT, label: 'fallback' },
  ];

  // Deduplicate identical attempts
  const seen = new Set<string>();
  const unique = attempts.filter((a) => {
    const key = `${a.token}|${a.chatId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(a.token && a.chatId);
  });

  const errors: string[] = [];
  for (const attempt of unique) {
    try {
      const result = await postViaProxy(attempt.token, attempt.chatId, payload);
      if (result.ok) return { status: 'bot', detail: result.detail };
      errors.push(`${attempt.label}: ${result.detail}`);
    } catch (err) {
      errors.push(`${attempt.label}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Last resort: open Telegram share so the order is not lost
  const user = (settings.telegramUser || 'nnexuspcbot').replace(/^@/, '');
  window.open(`https://t.me/${user}`, '_blank', 'noopener');
  window.open(`https://t.me/share/url?text=${encodeURIComponent(payload)}`, '_blank', 'noopener');

  return {
    status: 'error',
    detail: errors.join(' | ') || 'unknown',
  };
}
