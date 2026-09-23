import Stripe from 'stripe';

let client: Stripe | null = null;

export function getStripe() {
  const key = (process.env.STRIPE_SECRET_KEY || '').trim();
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  if (!client) {
    client = new Stripe(key, {
      apiVersion: '2026-08-26.dahlia',
    });
  }
  return client;
}

export function stripeConfigured() {
  return Boolean((process.env.STRIPE_SECRET_KEY || '').trim());
}

/** UZS is not a Stripe currency — charge USD converted from so'm. */
export function uzsToUsdCents(totalUzs: number) {
  const rate = Math.max(1, Number(process.env.UZS_PER_USD || 12500));
  const usd = totalUzs / rate;
  const cents = Math.max(50, Math.round(usd * 100)); // Stripe min ~$0.50
  return { cents, rate, usd: cents / 100 };
}

export function publicOrigin(reqHost?: string | string[] | undefined) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, '')}`;
  const host = Array.isArray(reqHost) ? reqHost[0] : reqHost;
  if (host) return `https://${host}`;
  return 'http://localhost:5173';
}
