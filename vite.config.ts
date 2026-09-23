import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

function readJsonBody(req: import('http').IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(Buffer.from(c)));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function json(res: import('http').ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(typeof data === 'string' ? data : JSON.stringify(data));
}

/** Same-origin proxy so the browser can talk to Telegram without CORS blocks. */
function telegramProxy(): Plugin {
  return {
    name: 'nexus-telegram-proxy',
    configureServer(server) {
      server.middlewares.use('/api/telegram-send', (req, res) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }
        if (req.method !== 'POST') {
          json(res, 405, { ok: false, description: 'POST only' });
          return;
        }
        void (async () => {
          try {
            const body = (await readJsonBody(req)) as {
              botToken?: string;
              chatId?: string | number;
              text?: string;
            };
            const token = String(body.botToken || '').trim();
            const chatId = String(body.chatId || '').trim();
            const text = String(body.text || '').slice(0, 3900);
            if (!token || !chatId || !text) {
              json(res, 400, { ok: false, description: 'botToken, chatId, text required' });
              return;
            }
            const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
            });
            json(res, tg.status, await tg.text());
          } catch (err) {
            json(res, 500, { ok: false, description: String(err) });
          }
        })();
      });

      server.middlewares.use('/api/telegram-photo', (req, res) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }
        if (req.method !== 'POST') {
          json(res, 405, { ok: false, description: 'POST only' });
          return;
        }
        void (async () => {
          try {
            const body = (await readJsonBody(req)) as {
              botToken?: string;
              chatId?: string | number;
              caption?: string;
              fileName?: string;
              dataUrl?: string;
            };
            const token = String(body.botToken || '').trim();
            const chatId = String(body.chatId || '').trim();
            const caption = String(body.caption || '').slice(0, 900);
            const dataUrl = String(body.dataUrl || '');
            const fileName = String(body.fileName || 'receipt.jpg');
            if (!token || !chatId || !dataUrl.startsWith('data:')) {
              json(res, 400, { ok: false, description: 'botToken, chatId, dataUrl required' });
              return;
            }

            const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
            if (!match) {
              json(res, 400, { ok: false, description: 'invalid dataUrl' });
              return;
            }
            const mime = match[1];
            const buffer = Buffer.from(match[2], 'base64');
            if (buffer.length > 8_000_000) {
              json(res, 400, { ok: false, description: 'file too large (max 8MB)' });
              return;
            }

            const form = new FormData();
            form.append('chat_id', chatId);
            if (caption) form.append('caption', caption);
            const blob = new Blob([new Uint8Array(buffer)], { type: mime });
            const isImage = mime.startsWith('image/');
            form.append(isImage ? 'photo' : 'document', blob, fileName);

            const endpoint = isImage ? 'sendPhoto' : 'sendDocument';
            const tg = await fetch(`https://api.telegram.org/bot${token}/${endpoint}`, {
              method: 'POST',
              body: form,
            });
            json(res, tg.status, await tg.text());
          } catch (err) {
            json(res, 500, { ok: false, description: String(err) });
          }
        })();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), telegramProxy()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
});
