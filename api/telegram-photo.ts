import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleOptions, json, methodNotAllowed, readBody } from './_lib/http';
import { sendTelegramPhoto } from './_lib/telegram';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return methodNotAllowed(res);

  try {
    const body = await readBody<{
      botToken?: string;
      chatId?: string | number;
      caption?: string;
      fileName?: string;
      dataUrl?: string;
    }>(req);

    if (body.botToken) process.env.TELEGRAM_BOT_TOKEN = String(body.botToken);
    if (body.chatId) process.env.TELEGRAM_CHAT_ID = String(body.chatId);

    const dataUrl = String(body.dataUrl || '');
    if (!dataUrl.startsWith('data:')) {
      json(res, 400, { ok: false, description: 'dataUrl required' });
      return;
    }

    const data = await sendTelegramPhoto({
      caption: String(body.caption || ''),
      fileName: String(body.fileName || 'receipt.jpg'),
      dataUrl,
    });
    json(res, data.ok ? 200 : 400, data);
  } catch (err) {
    json(res, 500, { ok: false, description: String(err) });
  }
}
