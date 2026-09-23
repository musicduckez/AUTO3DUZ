import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  ensureSchema,
  getSql,
  mapOrder,
  markOrderPaidByCode,
  type DbOrder,
} from '../_lib/db.js';
import { setCors } from '../_lib/http.js';
import {
  PaymeState,
  paymeError,
  paymeResult,
  uzsToTiyin,
  verifyPaymeAuth,
} from '../_lib/payme.js';
import { sendTelegramMessage } from '../_lib/telegram.js';

type RpcBody = {
  id?: unknown;
  method?: string;
  params?: Record<string, unknown>;
};

async function ensurePaymeTable() {
  const db = getSql();
  await db`
    CREATE TABLE IF NOT EXISTS payme_transactions (
      payme_id TEXT PRIMARY KEY,
      order_code TEXT NOT NULL,
      amount BIGINT NOT NULL,
      state INT NOT NULL,
      create_time BIGINT NOT NULL,
      perform_time BIGINT NOT NULL DEFAULT 0,
      cancel_time BIGINT NOT NULL DEFAULT 0,
      reason INT,
      merchant_trans_id TEXT NOT NULL
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS payme_order_code_idx ON payme_transactions (order_code)`;
}

function accountOrderId(params: Record<string, unknown> | undefined) {
  const account = (params?.account || {}) as Record<string, unknown>;
  return String(account.order_id || account.orderId || '').trim().toUpperCase();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'POST only' });
    return;
  }

  let body: RpcBody = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body as RpcBody) || {};
  } catch {
    res.status(200).json(paymeError(null, -32700, 'Parse error'));
    return;
  }

  const rpcId = body.id ?? null;

  if (!verifyPaymeAuth(req.headers.authorization)) {
    res.status(200).json(paymeError(rpcId, -32504, 'Insufficient privilege'));
    return;
  }

  try {
    await ensureSchema();
    await ensurePaymeTable();
    const db = getSql();
    const method = String(body.method || '');
    const params = (body.params || {}) as Record<string, unknown>;

    if (method === 'CheckPerformTransaction') {
      const code = accountOrderId(params);
      const amount = Number(params.amount || 0);
      if (!code) {
        res.status(200).json(paymeError(rpcId, -31050, 'Order not found', 'order_id'));
        return;
      }
      const rows = (await db`SELECT * FROM orders WHERE UPPER(code) = ${code} LIMIT 1`) as DbOrder[];
      if (!rows.length) {
        res.status(200).json(paymeError(rpcId, -31050, 'Order not found', 'order_id'));
        return;
      }
      const order = mapOrder(rows[0]);
      if (['paid', 'assembling', 'shipped', 'done'].includes(order.status)) {
        res.status(200).json(paymeError(rpcId, -31051, 'Order already paid', 'order_id'));
        return;
      }
      const expected = uzsToTiyin(order.total);
      if (amount !== expected) {
        res.status(200).json(paymeError(rpcId, -31001, 'Incorrect amount'));
        return;
      }
      res.status(200).json(paymeResult(rpcId, { allow: true }));
      return;
    }

    if (method === 'CreateTransaction') {
      const paymeId = String(params.id || '');
      const code = accountOrderId(params);
      const amount = Number(params.amount || 0);
      const time = Number(params.time || Date.now());

      if (!paymeId || !code) {
        res.status(200).json(paymeError(rpcId, -31050, 'Order not found', 'order_id'));
        return;
      }

      const existing = await db`SELECT * FROM payme_transactions WHERE payme_id = ${paymeId} LIMIT 1`;
      if (existing.length) {
        const tx = existing[0] as {
          create_time: number | string;
          merchant_trans_id: string;
          state: number | string;
        };
        res.status(200).json(
          paymeResult(rpcId, {
            create_time: Number(tx.create_time),
            transaction: tx.merchant_trans_id,
            state: Number(tx.state),
          }),
        );
        return;
      }

      const rows = (await db`SELECT * FROM orders WHERE UPPER(code) = ${code} LIMIT 1`) as DbOrder[];
      if (!rows.length) {
        res.status(200).json(paymeError(rpcId, -31050, 'Order not found', 'order_id'));
        return;
      }
      const order = mapOrder(rows[0]);
      if (['paid', 'assembling', 'shipped', 'done'].includes(order.status)) {
        res.status(200).json(paymeError(rpcId, -31051, 'Order already paid', 'order_id'));
        return;
      }
      const expected = uzsToTiyin(order.total);
      if (amount !== expected) {
        res.status(200).json(paymeError(rpcId, -31001, 'Incorrect amount'));
        return;
      }

      // One active transaction per order
      const active = await db`
        SELECT * FROM payme_transactions
        WHERE order_code = ${code} AND state = ${PaymeState.Created}
        LIMIT 1
      `;
      if (active.length && (active[0] as { payme_id: string }).payme_id !== paymeId) {
        res.status(200).json(paymeError(rpcId, -31099, 'Transaction already exists for order', 'order_id'));
        return;
      }

      const merchantTransId = `NX-${code}-${Date.now().toString(36)}`;
      const createTime = time || Date.now();
      await db`
        INSERT INTO payme_transactions (
          payme_id, order_code, amount, state, create_time, perform_time, cancel_time, merchant_trans_id
        ) VALUES (
          ${paymeId}, ${code}, ${amount}, ${PaymeState.Created}, ${createTime}, 0, 0, ${merchantTransId}
        )
      `;
      await db`
        UPDATE orders SET payment_method = 'payme', status = 'awaiting_payment'
        WHERE UPPER(code) = ${code}
      `;

      res.status(200).json(
        paymeResult(rpcId, {
          create_time: createTime,
          transaction: merchantTransId,
          state: PaymeState.Created,
        }),
      );
      return;
    }

    if (method === 'PerformTransaction') {
      const paymeId = String(params.id || '');
      const rows = await db`SELECT * FROM payme_transactions WHERE payme_id = ${paymeId} LIMIT 1`;
      if (!rows.length) {
        res.status(200).json(paymeError(rpcId, -31003, 'Transaction not found'));
        return;
      }
      const tx = rows[0] as {
        order_code: string;
        state: number | string;
        create_time: number | string;
        perform_time: number | string;
        cancel_time: number | string;
        merchant_trans_id: string;
        reason: number | null;
      };
      const state = Number(tx.state);

      if (state === PaymeState.Completed) {
        res.status(200).json(
          paymeResult(rpcId, {
            transaction: tx.merchant_trans_id,
            perform_time: Number(tx.perform_time),
            state: PaymeState.Completed,
          }),
        );
        return;
      }
      if (state !== PaymeState.Created) {
        res.status(200).json(paymeError(rpcId, -31008, 'Unable to perform operation'));
        return;
      }

      const performTime = Date.now();
      await db`
        UPDATE payme_transactions SET state = ${PaymeState.Completed}, perform_time = ${performTime}
        WHERE payme_id = ${paymeId}
      `;

      const order = await markOrderPaidByCode(tx.order_code, {
        paymentMethod: 'payme',
        stripeSessionId: null,
        stripePaymentIntent: paymeId,
      });

      if (order) {
        await sendTelegramMessage(
          [
            `💚 Payme оплата · ${order.code}`,
            `${order.name} · ${order.phone}`,
            `Σ ${order.total.toLocaleString('ru-RU')} so'm`,
            `Payme tx: ${paymeId}`,
            'Статус: Оплачен',
          ].join('\n'),
        );
      }

      res.status(200).json(
        paymeResult(rpcId, {
          transaction: tx.merchant_trans_id,
          perform_time: performTime,
          state: PaymeState.Completed,
        }),
      );
      return;
    }

    if (method === 'CancelTransaction') {
      const paymeId = String(params.id || '');
      const reason = Number(params.reason ?? 5);
      const rows = await db`SELECT * FROM payme_transactions WHERE payme_id = ${paymeId} LIMIT 1`;
      if (!rows.length) {
        res.status(200).json(paymeError(rpcId, -31003, 'Transaction not found'));
        return;
      }
      const tx = rows[0] as {
        order_code: string;
        state: number | string;
        create_time: number | string;
        perform_time: number | string;
        cancel_time: number | string;
        merchant_trans_id: string;
      };
      let state = Number(tx.state);
      let cancelTime = Number(tx.cancel_time) || 0;

      if (state === PaymeState.Created) {
        cancelTime = Date.now();
        state = PaymeState.Cancelled;
        await db`
          UPDATE payme_transactions SET state = ${state}, cancel_time = ${cancelTime}, reason = ${reason}
          WHERE payme_id = ${paymeId}
        `;
      } else if (state === PaymeState.Completed) {
        cancelTime = Date.now();
        state = PaymeState.CancelledAfterComplete;
        await db`
          UPDATE payme_transactions SET state = ${state}, cancel_time = ${cancelTime}, reason = ${reason}
          WHERE payme_id = ${paymeId}
        `;
        await db`
          UPDATE orders SET status = 'awaiting_payment'
          WHERE UPPER(code) = ${tx.order_code.toUpperCase()} AND status = 'paid'
        `;
      }

      res.status(200).json(
        paymeResult(rpcId, {
          transaction: tx.merchant_trans_id,
          cancel_time: cancelTime,
          state,
        }),
      );
      return;
    }

    if (method === 'CheckTransaction') {
      const paymeId = String(params.id || '');
      const rows = await db`SELECT * FROM payme_transactions WHERE payme_id = ${paymeId} LIMIT 1`;
      if (!rows.length) {
        res.status(200).json(paymeError(rpcId, -31003, 'Transaction not found'));
        return;
      }
      const tx = rows[0] as {
        create_time: number | string;
        perform_time: number | string;
        cancel_time: number | string;
        merchant_trans_id: string;
        state: number | string;
        reason: number | null;
      };
      res.status(200).json(
        paymeResult(rpcId, {
          create_time: Number(tx.create_time),
          perform_time: Number(tx.perform_time) || 0,
          cancel_time: Number(tx.cancel_time) || 0,
          transaction: tx.merchant_trans_id,
          state: Number(tx.state),
          reason: tx.reason ?? null,
        }),
      );
      return;
    }

    if (method === 'GetStatement') {
      const from = Number(params.from || 0);
      const to = Number(params.to || Date.now());
      const rows = await db`
        SELECT * FROM payme_transactions
        WHERE create_time >= ${from} AND create_time <= ${to}
        ORDER BY create_time ASC
      `;
      res.status(200).json(
        paymeResult(rpcId, {
          transactions: rows.map((tx) => {
            const t = tx as {
              payme_id: string;
              create_time: number | string;
              perform_time: number | string;
              cancel_time: number | string;
              state: number | string;
              amount: number | string;
              reason: number | null;
              order_code: string;
            };
            return {
              id: t.payme_id,
              time: Number(t.create_time),
              amount: Number(t.amount),
              account: { order_id: t.order_code },
              create_time: Number(t.create_time),
              perform_time: Number(t.perform_time) || 0,
              cancel_time: Number(t.cancel_time) || 0,
              transaction: t.payme_id,
              state: Number(t.state),
              reason: t.reason ?? null,
              receivers: null,
            };
          }),
        }),
      );
      return;
    }

    res.status(200).json(paymeError(rpcId, -32601, `Method not found: ${method}`));
  } catch (err) {
    res.status(200).json(paymeError(rpcId, -32400, err instanceof Error ? err.message : String(err)));
  }
}
