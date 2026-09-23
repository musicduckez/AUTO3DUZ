/** Payme Business helpers (UZS tiyin amounts). */

export function paymeConfigured() {
  return Boolean((process.env.PAYME_MERCHANT_ID || '').trim() && (process.env.PAYME_MERCHANT_KEY || '').trim());
}

export function paymeMerchantId() {
  return (process.env.PAYME_MERCHANT_ID || '').trim();
}

export function paymeMerchantKey() {
  return (process.env.PAYME_MERCHANT_KEY || '').trim();
}

export function paymeCheckoutHost() {
  const test = String(process.env.PAYME_TEST || '1') !== '0';
  return test ? 'https://test.paycom.uz' : 'https://checkout.paycom.uz';
}

/** 1 so'm = 100 tiyin */
export function uzsToTiyin(uzs: number) {
  return Math.round(Number(uzs) * 100);
}

export function tiyinToUzs(tiyin: number) {
  return Math.round(Number(tiyin) / 100);
}

/**
 * Build Payme GET checkout URL:
 * https://checkout.paycom.uz/base64(m=...;ac.order_id=...;a=...;c=...)
 */
export function buildPaymeCheckoutUrl(opts: {
  orderCode: string;
  amountUzs: number;
  returnUrl: string;
  lang?: 'ru' | 'uz' | 'en';
}) {
  const m = paymeMerchantId();
  if (!m) throw new Error('PAYME_MERCHANT_ID is not set');
  const amount = uzsToTiyin(opts.amountUzs);
  if (amount < 100) throw new Error('amount too small for Payme (min 1 so\'m)');

  const parts = [
    `m=${m}`,
    `ac.order_id=${opts.orderCode}`,
    `a=${amount}`,
    `l=${opts.lang || 'ru'}`,
    `c=${opts.returnUrl}`,
    `ct=2000`,
  ];
  const encoded = Buffer.from(parts.join(';'), 'utf8').toString('base64');
  return {
    url: `${paymeCheckoutHost()}/${encoded}`,
    amountTiyin: amount,
    host: paymeCheckoutHost(),
  };
}

/** Basic Auth: Paycom:<MERCHANT_KEY> (or custom login via PAYME_LOGIN). */
export function verifyPaymeAuth(authorization?: string | string[]) {
  const header = Array.isArray(authorization) ? authorization[0] : authorization;
  if (!header || !header.startsWith('Basic ')) return false;
  const key = paymeMerchantKey();
  if (!key) return false;
  const expectedLogin = (process.env.PAYME_LOGIN || 'Paycom').trim();
  try {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const i = decoded.indexOf(':');
    if (i < 0) return false;
    const login = decoded.slice(0, i);
    const password = decoded.slice(i + 1);
    return login === expectedLogin && password === key;
  } catch {
    return false;
  }
}

export function paymeError(id: unknown, code: number, message: string, data?: string) {
  return {
    jsonrpc: '2.0',
    id: id ?? null,
    error: {
      code,
      message: {
        ru: message,
        uz: message,
        en: message,
      },
      data,
    },
  };
}

export function paymeResult(id: unknown, result: unknown) {
  return { jsonrpc: '2.0', id: id ?? null, result };
}

export const PaymeState = {
  Created: 1,
  Completed: 2,
  Cancelled: -1,
  CancelledAfterComplete: -2,
} as const;
