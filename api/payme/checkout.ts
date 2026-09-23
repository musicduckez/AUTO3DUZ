import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema, getSql, mapOrder, type DbOrder } from '../_lib/db.js';
import { handleOptions, json, methodNotAllowed, readBody } from '../_lib/http.js';
import { buildPaymeCheckoutUrl, paymeConfigured } from '../_lib/payme.js';

function originFrom(req: VercelRequest) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, '')}`;
  const host = Array.isArray(req.headers.host) ? req.headers.host[0] : req.headers.host;
  if (host) {
    const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
    return `${proto}://${host}`;
  }
  return 'http://localhost:4173';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return methodNotAllowed(res);

  try {
    if (!paymeConfigured()) {
      json(res, 503, { ok: false, error: 'Payme is not configured (PAYME_MERCHANT_ID / PAYME_MERCHANT_KEY)' });
      return;
    }

    await ensureSchema();
    const body = await readBody<{ code?: string; lang?: 'ru' | 'uz' | 'en' }>(req);
    const code = String(body.code || '').trim().toUpperCase();
    if (!code) {
      json(res, 400, { ok: false, error: 'code required' });
      return;
    }

    const db = getSql();
    const rows = (await db`SELECT * FROM orders WHERE UPPER(code) = ${code} LIMIT 1`) as DbOrder[];
    if (!rows.length) {
      json(res, 404, { ok: false, error: 'order not found' });
      return;
    }
    const order = mapOrder(rows[0]);
    if (['paid', 'assembling', 'shipped', 'done'].includes(order.status)) {
      json(res, 400, { ok: false, error: 'order already paid', order });
      return;
    }

    const origin = originFrom(req);
    const checkout = buildPaymeCheckoutUrl({
      orderCode: order.code,
      amountUzs: order.total,
      returnUrl: `${origin}/track/${order.code}?payme=return`,
      lang: body.lang || 'ru',
    });

    await db`
      UPDATE orders SET
        payment_method = 'payme',
        status = 'awaiting_payment'
      WHERE UPPER(code) = ${code}
    `;

    json(res, 200, {
      ok: true,
      url: checkout.url,
      amountUzs: order.total,
      amountTiyin: checkout.amountTiyin,
      host: checkout.host,
    });
  } catch (err) {
    json(res, 500, { ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}
