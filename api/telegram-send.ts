import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleOptions, json, methodNotAllowed, readBody } from './_lib/http';
import { sendTelegramMessage } from './_lib/telegram';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return methodNotAllowed(res);

  try {
    const body = await readBody<{
      botToken?: string;
      chatId?: string | number;
      text?: string;
    }>(req);

    // Prefer server env; allow body overrides for local/admin testing.
    if (body.botToken) process.env.TELEGRAM_BOT_TOKEN = String(body.botToken);
    if (body.chatId) process.env.TELEGRAM_CHAT_ID = String(body.chatId);

    const text = String(body.text || '');
    if (!text) {
      json(res, 400, { ok: false, description: 'text required' });
      return;
    }

    const data = await sendTelegramMessage(text);
    json(res, data.ok ? 200 : 400, data);
  } catch (err) {
    json(res, 500, { ok: false, description: String(err) });
  }
}
