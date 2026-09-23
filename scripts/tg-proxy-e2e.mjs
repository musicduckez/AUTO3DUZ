import puppeteer from 'puppeteer-core';

const BASE = 'http://127.0.0.1:5173';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  args: ['--no-sandbox', '--window-size=1280,900'],
  defaultViewport: { width: 1280, height: 900 },
});
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => {
  window.open = () => null;
});

const hits = [];
page.on('response', async (res) => {
  if (res.url().includes('/api/telegram-send')) {
    const text = await res.text().catch(() => '');
    hits.push({ status: res.status(), text: text.slice(0, 180) });
  }
});

try {
  await page.goto(`${BASE}/catalog`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('article button');
  await page.click('article button');
  await sleep(300);
  await page.goto(`${BASE}/checkout`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('form');
  await page.type('input[name="name"]', 'Амирбек');
  await page.type('input[name="phone"]', '998901112233');
  await page.type('input[name="telegram"]', '@duuckez');
  await page.type('input[name="address"]', 'Tashkent');
  await page.click('form button');
  await sleep(3000);
  const body = await page.evaluate(() => document.body.innerText);
  console.log('page has status:', body.includes('Отправлено в Telegram'));
  console.log('order:', (body.match(/NX-[A-Z0-9]{4}/) || [])[0]);
  console.log('proxy hits:', JSON.stringify(hits, null, 2));
  console.log(hits.some((h) => h.status === 200 && h.text.includes('"ok":true')) ? 'PASS' : 'FAIL');
} finally {
  await browser.close();
}
