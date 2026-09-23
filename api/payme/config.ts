import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleOptions, json, methodNotAllowed } from '../_lib/http.js';
import { paymeCheckoutHost, paymeConfigured, paymeMerchantId } from '../_lib/payme.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') return methodNotAllowed(res);

  json(res, 200, {
    ok: true,
    configured: paymeConfigured(),
    merchantId: paymeConfigured() ? paymeMerchantId().slice(0, 6) + '…' : '',
    host: paymeCheckoutHost(),
    test: String(process.env.PAYME_TEST || '1') !== '0',
  });
}
