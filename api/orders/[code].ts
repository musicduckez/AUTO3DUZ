import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema, getSql, mapOrder, type DbOrder } from '../_lib/db.js';
import { handleOptions, json, methodNotAllowed, readBody } from '../_lib/http.js';
import { sendTelegramMessage, sendTelegramPhoto } from '../_lib/telegram.js';

function codeFromReq(req: VercelRequest) {
  const raw = req.query.code;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return String(value || '').trim().toUpperCase();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  try {
    await ensureSchema();
    const db = getSql();
    const code = codeFromReq(req);
    if (!code) {
      json(res, 400, { ok: false, error: 'code required' });
      return;
    }

    if (req.method === 'GET') {
      const rows = (await db`SELECT * FROM orders WHERE UPPER(code) = ${code} LIMIT 1`) as DbOrder[];
      if (!rows.length) {
        json(res, 404, { ok: false, error: 'not found' });
        return;
      }
      json(res, 200, { ok: true, order: mapOrder(rows[0]) });
      return;
    }

    if (req.method === 'PATCH') {
      const body = await readBody<{
        status?: string;
        receiptDataUrl?: string;
        receiptFileName?: string;
        receiptNote?: string;
        notify?: boolean;
        notifyText?: string;
        sendReceiptToTelegram?: boolean;
      }>(req);

      const rows = (await db`SELECT * FROM orders WHERE UPPER(code) = ${code} LIMIT 1`) as DbOrder[];
      if (!rows.length) {
        json(res, 404, { ok: false, error: 'not found' });
        return;
      }
      const current = mapOrder(rows[0]);

      const status = body.status ? String(body.status) : current.status;
      const receiptDataUrl =
        body.receiptDataUrl !== undefined ? String(body.receiptDataUrl || '') || null : current.receiptDataUrl || null;
      const receiptFileName =
        body.receiptFileName !== undefined
          ? String(body.receiptFileName || '') || null
          : current.receiptFileName || null;
      const receiptNote =
        body.receiptNote !== undefined ? String(body.receiptNote || '') || null : current.receiptNote || null;
      const receiptUploadedAt =
        body.receiptDataUrl !== undefined ? Date.now() : current.receiptUploadedAt ?? null;

      await db`
        UPDATE orders SET
          status = ${status},
          receipt_data_url = ${receiptDataUrl},
          receipt_file_name = ${receiptFileName},
          receipt_uploaded_at = ${receiptUploadedAt},
          receipt_note = ${receiptNote}
        WHERE UPPER(code) = ${code}
      `;

      const updatedRows = (await db`SELECT * FROM orders WHERE UPPER(code) = ${code} LIMIT 1`) as DbOrder[];
      const order = mapOrder(updatedRows[0]);

      let telegram: { status: string; detail?: string } | undefined;
      if (body.sendReceiptToTelegram && receiptDataUrl) {
        const caption = [
          `🧾 Чек оплаты · ${order.code}`,
          `${order.name} · ${order.phone}`,
          `Сумма: ${order.total.toLocaleString('ru-RU')} so'm`,
          receiptNote ? `Комментарий: ${receiptNote}` : '',
        ]
          .filter(Boolean)
          .join('\n');
        const tg = await sendTelegramPhoto({
          caption,
          fileName: receiptFileName || 'receipt.jpg',
          dataUrl: receiptDataUrl,
        });
        telegram = tg.ok
          ? { status: 'bot', detail: 'photo ok' }
          : { status: 'error', detail: tg.description || 'photo failed' };
      } else if (body.notify && body.notifyText) {
        const tg = await sendTelegramMessage(String(body.notifyText));
        telegram = tg.ok
          ? { status: 'bot', detail: `message_id=${tg.result?.message_id ?? '?'}` }
          : { status: 'error', detail: tg.description || 'telegram failed' };
      }

      json(res, 200, { ok: true, order, telegram });
      return;
    }

    methodNotAllowed(res);
  } catch (err) {
    json(res, 500, { ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}
