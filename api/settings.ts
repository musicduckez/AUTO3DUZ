import type { VercelRequest, VercelResponse } from '@vercel/node';
import { defaultSettings, ensureSchema, getSql } from './_lib/db.js';
import { handleOptions, json, methodNotAllowed, readBody } from './_lib/http.js';

function publicSettings(data: Record<string, unknown>) {
  const { botToken: _t, passwordHash: _p, ...rest } = data;
  return {
    ...defaultSettings(),
    ...rest,
    // Never expose full bot token to the browser; keep empty placeholder.
    botToken: '',
    passwordHash: '',
    hasBotToken: Boolean(data.botToken || process.env.TELEGRAM_BOT_TOKEN),
    hasPassword: Boolean(data.passwordHash),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  try {
    await ensureSchema();
    const db = getSql();

    if (req.method === 'GET') {
      const rows = await db`SELECT data FROM settings WHERE id = 1`;
      const data = (rows[0]?.data || {}) as Record<string, unknown>;
      json(res, 200, { ok: true, settings: publicSettings(data) });
      return;
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const body = await readBody<Record<string, unknown>>(req);
      const rows = await db`SELECT data FROM settings WHERE id = 1`;
      const current = (rows[0]?.data || defaultSettings()) as Record<string, unknown>;
      const next = { ...current };

      const keys = [
        'telegramUser',
        'botToken',
        'chatId',
        'card',
        'cardHolder',
        'cardBank',
        'click',
        'payme',
        'promoRu',
        'promoUz',
        'passwordHash',
      ] as const;

      for (const key of keys) {
        if (body[key] !== undefined && body[key] !== null) {
          const val = String(body[key]);
          // Empty botToken means "keep existing"
          if (key === 'botToken' && !val.trim()) continue;
          next[key] = val;
        }
      }

      await db`
        INSERT INTO settings (id, data, updated_at)
        VALUES (1, ${JSON.stringify(next)}::jsonb, NOW())
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
      `;
      json(res, 200, { ok: true, settings: publicSettings(next) });
      return;
    }

    methodNotAllowed(res);
  } catch (err) {
    json(res, 500, { ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}
