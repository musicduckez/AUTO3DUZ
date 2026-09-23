import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema, getSql, mapOrder, type DbOrder } from '../_lib/db.js';
import { handleOptions, json, methodNotAllowed, readBody } from '../_lib/http.js';
import { getStripe, publicOrigin, stripeConfigured, uzsToUsdCents } from '../_lib/stripe.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return methodNotAllowed(res);

  try {
    if (!stripeConfigured()) {
      json(res, 503, { ok: false, error: 'Stripe is not configured (STRIPE_SECRET_KEY)' });
      return;
    }

    await ensureSchema();
    const body = await readBody<{ code?: string }>(req);
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

    const { cents, rate, usd } = uzsToUsdCents(order.total);
    const origin = publicOrigin(req.headers.host);
    const stripe = getStripe();

    const itemSummary = (order.items as Array<{ title?: string; productId: string; qty: number }>)
      .map((it) => `${it.title || it.productId} ×${it.qty}`)
      .join(', ')
      .slice(0, 400);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      client_reference_id: order.code,
      metadata: {
        order_code: order.code,
        order_id: order.id,
        total_uzs: String(order.total),
        uzs_per_usd: String(rate),
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: cents,
            product_data: {
              name: `NEXUS PC · ${order.code}`,
              description: itemSummary || `${order.total.toLocaleString('ru-RU')} so'm`,
            },
          },
        },
      ],
      success_url: `${origin}/track/${order.code}?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/track/${order.code}?stripe=cancel`,
      locale: 'auto',
    });

    await db`
      UPDATE orders SET
        stripe_session_id = ${session.id},
        payment_method = 'stripe',
        status = 'awaiting_payment'
      WHERE UPPER(code) = ${code}
    `;

    json(res, 200, {
      ok: true,
      url: session.url,
      sessionId: session.id,
      amountUsd: usd,
      amountUzs: order.total,
      rate,
    });
  } catch (err) {
    json(res, 500, { ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}
