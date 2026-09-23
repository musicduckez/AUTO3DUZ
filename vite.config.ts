import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

/** Same-origin proxy so the browser can send Telegram messages without CORS blocks. */
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
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, description: 'POST only' }));
          return;
        }

        const chunks: Buffer[] = [];
        req.on('data', (c) => chunks.push(Buffer.from(c)));
        req.on('end', () => {
          void (async () => {
            try {
              const raw = Buffer.concat(chunks).toString('utf8');
              const body = JSON.parse(raw || '{}') as {
                botToken?: string;
                chatId?: string | number;
                text?: string;
              };
              const token = String(body.botToken || '').trim();
              const chatId = String(body.chatId || '').trim();
              const text = String(body.text || '').slice(0, 3900);
              if (!token || !chatId || !text) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ ok: false, description: 'botToken, chatId, text required' }));
                return;
              }

              const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  text,
                  disable_web_page_preview: true,
                }),
              });
              const data = await tg.text();
              res.statusCode = tg.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(data);
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: false, description: String(err) }));
            }
          })();
        });
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
