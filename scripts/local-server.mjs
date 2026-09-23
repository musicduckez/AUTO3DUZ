#!/usr/bin/env node
/**
 * Local production server: static dist/ + Vercel-style /api handlers.
 * Used with Cloudflare Tunnel so regions blocked by anonymous Vercel can access the app.
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sirv from 'sirv';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  const envPath = path.join(root, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    const k = line.slice(0, i);
    let v = line.slice(i + 1);
    if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv();

const PORT = Number(process.env.PORT || 4173);
const dist = path.join(root, 'dist');

/** @type {Array<{ match: (url: string, method: string) => Record<string,string>|null, load: () => Promise<any> }>} */
const routes = [
  {
    match: (url) => (url === '/api/health' ? {} : null),
    load: () => import('../api/health.ts'),
  },
  {
    match: (url) => (url === '/api/settings' ? {} : null),
    load: () => import('../api/settings.ts'),
  },
  {
    match: (url) => (url === '/api/orders' || url === '/api/orders/' ? {} : null),
    load: () => import('../api/orders/index.ts'),
  },
  {
    match: (url) => {
      const m = /^\/api\/orders\/([^/?#]+)/.exec(url);
      return m ? { code: decodeURIComponent(m[1]) } : null;
    },
    load: () => import('../api/orders/[code].ts'),
  },
  {
    match: (url) => (url === '/api/telegram-send' ? {} : null),
    load: () => import('../api/telegram-send.ts'),
  },
  {
    match: (url) => (url === '/api/telegram-photo' ? {} : null),
    load: () => import('../api/telegram-photo.ts'),
  },
  {
    match: (url) => (url === '/api/stripe/config' ? {} : null),
    load: () => import('../api/stripe/config.ts'),
  },
  {
    match: (url) => (url === '/api/stripe/checkout' ? {} : null),
    load: () => import('../api/stripe/checkout.ts'),
  },
  {
    match: (url) => (url.startsWith('/api/stripe/confirm') ? {} : null),
    load: () => import('../api/stripe/confirm.ts'),
  },
  {
    match: (url) => (url === '/api/stripe/webhook' ? {} : null),
    load: () => import('../api/stripe/webhook.ts'),
  },
  {
    match: (url) => (url === '/api/payme/config' ? {} : null),
    load: () => import('../api/payme/config.ts'),
  },
  {
    match: (url) => (url === '/api/payme/checkout' ? {} : null),
    load: () => import('../api/payme/checkout.ts'),
  },
  {
    match: (url) => (url === '/api/payme' || url === '/api/payme/' ? {} : null),
    load: () => import('../api/payme/index.ts'),
  },
];

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function wrapRes(res) {
  let statusCode = 200;
  const api = {
    statusCode,
    setHeader: (k, v) => res.setHeader(k, v),
    getHeader: (k) => res.getHeader(k),
    end: (chunk) => res.end(chunk),
    status(code) {
      statusCode = code;
      res.statusCode = code;
      return api;
    },
    json(data) {
      res.statusCode = statusCode;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
      return api;
    },
  };
  return api;
}

const staticHandler = sirv(dist, { single: true, dev: false });

const server = createServer(async (req, res) => {
  const host = req.headers.host || `localhost:${PORT}`;
  const url = new URL(req.url || '/', `http://${host}`);
  const pathname = url.pathname;

  if (pathname.startsWith('/api/')) {
    try {
      for (const route of routes) {
        const params = route.match(pathname, req.method || 'GET');
        if (!params) continue;

        const mod = await route.load();
        const handler = mod.default;
        const raw = await readBody(req);
        let body;
        const ct = String(req.headers['content-type'] || '');
        if (raw.length && ct.includes('application/json')) {
          try {
            body = JSON.parse(raw.toString('utf8') || '{}');
          } catch {
            body = {};
          }
        }

        const query = Object.fromEntries(url.searchParams.entries());
        const vercelReq = Object.assign(req, {
          query: { ...query, ...params },
          body,
          cookies: {},
        });
        // For webhook raw body access, attach buffer
        vercelReq.rawBody = raw;

        await handler(vercelReq, wrapRes(res));
        return;
      }
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: false, error: 'API route not found' }));
      return;
    } catch (err) {
      console.error(err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
      return;
    }
  }

  staticHandler(req, res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`NEXUS PC listening on http://0.0.0.0:${PORT}`);
  console.log(`stripe=${Boolean(process.env.STRIPE_SECRET_KEY)} neon=${Boolean(process.env.DATABASE_URL)}`);
});
