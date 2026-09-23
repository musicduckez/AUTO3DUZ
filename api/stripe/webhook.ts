import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Readable } from 'node:stream';
import { ensureSchema, markOrderPaidByCode } from '../_lib/db.js';
import { setCors } from '../_lib/http.js';
import { sendTelegramMessage } from '../_lib/telegram.js';
import { getStripe, stripeConfigured } from '../_lib/stripe.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function buffer(readable: Readable) {
  const chunks: Buffer[] = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
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

  try {
    if (!stripeConfigured()) {
      res.status(503).json({ ok: false, error: 'Stripe is not configured' });
      return;
    }

    const stripe = getStripe();
    const webhookSecret = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
    const sig = req.headers['stripe-signature'];

    let event;
    const buf = await buffer(req);

    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
    } else {
      // Dev / temporary deploy without webhook secret: accept JSON body (not for production).
      event = JSON.parse(buf.toString('utf8'));
    }

    await ensureSchema();

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object as {
        id: string;
        payment_status?: string;
        client_reference_id?: string | null;
        metadata?: { order_code?: string };
        payment_intent?: string | { id: string } | null;
      };
      const code = String(session.metadata?.order_code || session.client_reference_id || '').toUpperCase();
      if (code && (session.payment_status === 'paid' || event.type === 'checkout.session.completed')) {
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
              `💳 Stripe webhook · ${order.code}`,
              `${order.name} · ${order.phone}`,
              `Σ ${order.total.toLocaleString('ru-RU')} so'm`,
              'Статус: Оплачен',
            ].join('\n'),
          );
        }
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    res.status(400).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}
