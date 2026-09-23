import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema, getSql } from './_lib/db.js';
import { handleOptions, json } from './_lib/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  try {
    await ensureSchema();
    const db = getSql();
    const rows = await db`select 1 as ok`;
    json(res, 200, {
      ok: true,
      db: rows[0]?.ok === 1,
      neon: Boolean(process.env.DATABASE_URL),
      telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
      stripe: Boolean(process.env.STRIPE_SECRET_KEY),
      payme: Boolean(process.env.PAYME_MERCHANT_ID && process.env.PAYME_MERCHANT_KEY),
    });
  } catch (err) {
    json(res, 500, { ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}
