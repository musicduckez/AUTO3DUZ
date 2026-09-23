import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const BASE = 'http://127.0.0.1:5173';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  args: ['--no-sandbox', '--window-size=1280,900', '--use-gl=angle', '--use-angle=swiftshader'],
  defaultViewport: { width: 1280, height: 900 },
});

const page = await browser.newPage();
await page.evaluateOnNewDocument(() => {
  window.open = () => null;
});

const tgHits = [];
await page.setRequestInterception(true);
page.on('request', (req) => {
  const url = req.url();
  if (url.includes('api.telegram.org')) {
    tgHits.push({ method: req.method(), url: url.slice(0, 120), post: req.postData()?.slice(0, 200) });
  }
  req.continue();
});

try {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  // Simulate broken old localStorage, then reload so store migration fixes it.
  await page.evaluate(() => {
    localStorage.setItem(
      'nexus_settings',
      JSON.stringify({
        telegramUser: 'nnexuspcbot',
        botToken: '',
        chatId: '',
        card: 'x',
        click: 'x',
        payme: 'x',
        promoRu: '',
        promoUz: '',
        passwordHash: '',
      }),
    );
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(500);

  const settings = await page.evaluate(() => JSON.parse(localStorage.getItem('nexus_settings') || '{}'));
  console.log('settings after migrate', { chatId: settings.chatId, hasToken: Boolean(settings.botToken) });

  await page.goto(`${BASE}/catalog`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('article button');
  await page.click('article button');
  await sleep(400);

  await page.goto(`${BASE}/checkout`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('form');
  await page.type('input[name="name"]', 'Амирбек');
  await page.type('input[name="phone"]', '998901112233');
  await page.type('input[name="telegram"]', '@duuckez');
  await page.type('input[name="address"]', 'Tashkent test');
  await page.click('form button');
  await sleep(2500);

  const body = await page.evaluate(() => document.body.innerText);
  const code = (body.match(/NX-[A-Z0-9]{4}/) || [])[0];
  console.log('order', code);
  console.log('tgHits', JSON.stringify(tgHits, null, 2));
  console.log(tgHits.length ? 'PASS telegram request fired' : 'FAIL no telegram request');
  fs.mkdirSync('/tmp/nexus-e2e', { recursive: true });
  await page.screenshot({ path: '/tmp/nexus-e2e/tg-checkout.png' });
} catch (e) {
  console.error('ERR', e);
} finally {
  await browser.close();
}
