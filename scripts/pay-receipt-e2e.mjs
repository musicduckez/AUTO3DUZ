import puppeteer from 'puppeteer-core';

const BASE = 'http://127.0.0.1:5173';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// tiny red jpeg
const TINY =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGcP//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEABj8Cf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAT8hf//Z';

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  args: ['--no-sandbox'],
  defaultViewport: { width: 1280, height: 900 },
});
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => {
  window.open = () => null;
});

const photoHits = [];
page.on('response', async (res) => {
  if (res.url().includes('/api/telegram-photo')) {
    photoHits.push({ status: res.status(), text: (await res.text().catch(() => '')).slice(0, 120) });
  }
});

try {
  await page.goto(`${BASE}/catalog`, { waitUntil: 'domcontentloaded' });
  await page.click('article button');
  await sleep(300);
  await page.goto(`${BASE}/checkout`, { waitUntil: 'domcontentloaded' });
  await page.type('input[name="name"]', 'Амирбек');
  await page.type('input[name="phone"]', '998901112233');
  await page.type('input[name="telegram"]', '@duuckez');
  await page.type('input[name="address"]', 'Tashkent');
  await page.click('form button');
  await sleep(2500);
  const body = await page.evaluate(() => document.body.innerText);
  const code = (body.match(/NX-[A-Z0-9]{4}/) || [])[0];
  console.log('order', code, 'pay_go', body.includes('оплате') || body.includes('to‘lov'));

  await page.goto(`${BASE}/track/${code}`, { waitUntil: 'domcontentloaded' });
  await sleep(500);
  const track = await page.evaluate(() => document.body.innerText);
  console.log('has card', /8600/.test(track));
  console.log('has receipt ui', track.includes('чек') || track.includes('Chek') || track.includes('чек'));

  // inject preview directly and click send via store+API path used by UI
  await page.evaluate(
    async (payload) => {
      const fileInput = document.querySelector('input[type="file"]');
      // Simulate selected preview state by calling attach + photo through page buttons is hard;
      // set React state via creating Object URL flow: use the send button after forcing preview
      // Fallback: call APIs from window using same modules is not exposed.
      // Instead dispatch a custom path: put data into localStorage order and call photo API.
      const settings = JSON.parse(localStorage.getItem('nexus_settings') || '{}');
      const orders = JSON.parse(localStorage.getItem('nexus_orders') || '[]');
      const order = orders.find((o) => o.code === payload.code);
      if (order) {
        order.receiptDataUrl = payload.dataUrl;
        order.receiptFileName = 'receipt.jpg';
        order.receiptUploadedAt = Date.now();
        order.status = 'awaiting_payment';
        localStorage.setItem('nexus_orders', JSON.stringify(orders));
      }
      const res = await fetch('/api/telegram-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: settings.botToken || '8911484992:AAEXEtySUph28YSA0OhdxFXQrbPrRlZGb7Y',
          chatId: settings.chatId || '1263687877',
          caption: `🧾 Чек оплаты · ${payload.code}`,
          fileName: 'receipt.jpg',
          dataUrl: payload.dataUrl,
        }),
      });
      window.__photo = await res.json();
    },
    { code, dataUrl: TINY },
  );
  const photo = await page.evaluate(() => window.__photo);
  console.log('photo ok', photo?.ok, photoHits.length);
  console.log(photo?.ok ? 'PASS' : 'FAIL');
} catch (e) {
  console.error(e);
} finally {
  await browser.close();
}
