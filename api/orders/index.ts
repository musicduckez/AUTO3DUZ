import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema, getSql, mapOrder, type DbOrder } from '../_lib/db.js';
import { handleOptions, json, methodNotAllowed, readBody } from '../_lib/http.js';
import { formatOrderMessage, sendTelegramMessage } from '../_lib/telegram.js';

function orderCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = 'NX-';
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function rid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  try {
    await ensureSchema();
    const db = getSql();

    if (req.method === 'GET') {
      const rows = (await db`
        SELECT * FROM orders ORDER BY created_at DESC LIMIT 200
      `) as DbOrder[];
      json(res, 200, { ok: true, orders: rows.map(mapOrder) });
      return;
    }

    if (req.method === 'POST') {
      const body = await readBody<{
        name?: string;
        phone?: string;
        telegram?: string;
        city?: string;
        address?: string;
        comment?: string;
        total?: number;
        delivery?: number;
        items?: Array<{ productId: string; qty: number; title?: string; price?: number }>;
        code?: string;
        id?: string;
        status?: string;
      }>(req);

      const name = String(body.name || '').trim();
      const phone = String(body.phone || '').trim();
      const telegram = String(body.telegram || '').trim();
      const city = String(body.city || '').trim();
      const address = String(body.address || '').trim();
      const items = Array.isArray(body.items) ? body.items : [];
      const total = Number(body.total || 0);
      if (!name || !phone || !telegram || !address || !items.length || !total) {
        json(res, 400, { ok: false, error: 'name, phone, telegram, address, items, total required' });
        return;
      }

      const order = {
        id: body.id || rid(),
        code: (body.code || orderCode()).toUpperCase(),
        createdAt: Date.now(),
        status: body.status || 'awaiting_payment',
        name,
        phone,
        telegram,
        city,
        address,
        comment: String(body.comment || ''),
        items,
        total,
        delivery: Number(body.delivery || 0),
      };

      await db`
        INSERT INTO orders (
          id, code, created_at, status, name, phone, telegram, city, address, comment,
          items, total, delivery
        ) VALUES (
          ${order.id},
          ${order.code},
          ${order.createdAt},
          ${order.status},
          ${order.name},
          ${order.phone},
          ${order.telegram},
          ${order.city},
          ${order.address},
          ${order.comment},
          ${JSON.stringify(order.items)}::jsonb,
          ${order.total},
          ${order.delivery}
        )
      `;

      const text = formatOrderMessage(order);
      const tg = await sendTelegramMessage(text);

      json(res, 201, {
        ok: true,
        order,
        telegram: tg.ok ? { status: 'bot', detail: `message_id=${(tg as { result?: { message_id?: number } }).result?.message_id ?? '?'}` } : { status: 'error', detail: (tg as { description?: string }).description || 'telegram failed' },
      });
      return;
    }

    methodNotAllowed(res);
  } catch (err) {
    json(res, 500, { ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}
