import type { VercelRequest, VercelResponse } from '@vercel/node';

export function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token');
}

export function json(res: VercelResponse, status: number, data: unknown) {
  setCors(res);
  res.status(status).json(data);
}

export function methodNotAllowed(res: VercelResponse) {
  json(res, 405, { ok: false, error: 'Method not allowed' });
}

export async function readBody<T = unknown>(req: VercelRequest): Promise<T> {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body || '{}') as T;
      } catch {
        return {} as T;
      }
    }
    return req.body as T;
  }
  return {} as T;
}

export function handleOptions(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    setCors(res);
    res.status(204).end();
    return true;
  }
  return false;
}
