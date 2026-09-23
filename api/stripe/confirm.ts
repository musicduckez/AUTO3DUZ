import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema, markOrderPaidByCode } from '../_lib/db.js';
import { handleOptions, json, methodNotAllowed } from '../_lib/http.js';
import { sendTelegramMessage } from '../_lib/telegram.js';
import { getStripe, stripeConfigured } from '../_lib/stripe.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET' && req.method !== 'POST') return methodNotAllowed(res);

  try {
    if (!stripeConfigured()) {
      json(res, 503, { ok: false, error: 'Stripe is not configured' });
      return;
    }

    await ensureSchema();
    const raw = req.method === 'GET' ? req.query.session_id : (req.body as { session_id?: string })?.session_id;
    const sessionId = String(Array.isArray(raw) ? raw[0] : raw || '').trim();
    if (!sessionId) {
      json(res, 400, { ok: false, error: 'session_id required' });
      return;
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const code = String(session.metadata?.order_code || session.client_reference_id || '').toUpperCase();

    if (!code) {
      json(res, 400, { ok: false, error: 'order code missing on session' });
      return;
    }

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      json(res, 200, {
        ok: true,
        paid: false,
        paymentStatus: session.payment_status,
        status: session.status,
        code,
      });
      return;
    }

    const intent =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id || null;

    const order = await markOrderPaidByCode(code, {
      paymentMethod: 'stripe',
      stripeSessionId: session.id,
      stripePaymentIntent: intent,
    });

    if (order) {
      await sendTelegramMessage(
        [
          `💳 Stripe оплата · ${order.code}`,
          `${order.name} · ${order.phone}`,
          `Σ ${order.total.toLocaleString('ru-RU')} so'm`,
          `Session: ${session.id}`,
          'Статус: Оплачен',
        ].join('\n'),
      );
    }

    json(res, 200, { ok: true, paid: true, order });
  } catch (err) {
    json(res, 500, { ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}
