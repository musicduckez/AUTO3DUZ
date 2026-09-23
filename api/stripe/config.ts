import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleOptions, json, methodNotAllowed } from '../_lib/http.js';
import { stripeConfigured, uzsToUsdCents } from '../_lib/stripe.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') return methodNotAllowed(res);

  const sample = Number(req.query.uzs || 12_500_000);
  const conv = uzsToUsdCents(sample);
  json(res, 200, {
    ok: true,
    configured: stripeConfigured(),
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    currency: 'usd',
    uzsPerUsd: conv.rate,
    sample: { uzs: sample, usd: conv.usd, cents: conv.cents },
  });
}
