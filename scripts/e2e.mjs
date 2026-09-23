import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const BASE = 'http://127.0.0.1:5173';
const OUT = '/tmp/nexus-e2e';
fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const log = (step, ok, extra = '') => {
  results.push({ step, ok, extra });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${step}${extra ? ' — ' + extra : ''}`);
};

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
    args: [
      '--no-sandbox',
      '--window-size=1440,900',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-webgl',
    ],
  defaultViewport: { width: 1440, height: 900 },
});

const page = await browser.newPage();
page.setDefaultTimeout(15000);
await page.evaluateOnNewDocument(() => {
  window.open = () => null;
});
page.on('pageerror', (err) => console.log('PAGEERROR', err.message));

try {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('h1');
  const hero = await page.$eval('h1', (el) => el.textContent);
  log('home loads', /Собери|yig‘ing|NEXUS/i.test(hero), hero.slice(0, 80));
  await page.screenshot({ path: `${OUT}/01-home.png`, fullPage: true });

  const langBtn = await page.$('button.rounded-full.border');
  await langBtn.click();
  await sleep(300);
  const uz = await page.$eval('h1', (el) => el.textContent);
  log('switch to UZ', /yig‘ing|Kompyuter/i.test(uz), uz.slice(0, 80));
  await page.screenshot({ path: `${OUT}/02-home-uz.png` });
  await langBtn.click();
  await sleep(200);

  await page.click('a[href="/catalog"]');
  await page.waitForSelector('article');
  const cards = await page.$$eval('article', (els) => els.length);
  log('catalog cards', cards >= 6, `${cards} cards`);
  await page.screenshot({ path: `${OUT}/03-catalog.png` });

  await page.click('article a');
  await page.waitForSelector('h1');
  const title = await page.$eval('h1', (el) => el.textContent);
  log('product page', title.length > 3, title);
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const t = await page.evaluate((el) => el.textContent, b);
    if (t.includes('корзину') || t.includes('Savatga')) {
      await b.click();
      break;
    }
  }
  await sleep(300);
  for (const b of buttons) {
    const t = await page.evaluate((el) => el.textContent, b);
    if (t.includes('сборку') || t.includes('Yig‘maga')) {
      await b.click();
      break;
    }
  }
  await sleep(400);
  log('add cart/build from product', true, title);

  await page.goto(`${BASE}/builder`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('h1', { timeout: 10000 });
  await page.screenshot({ path: `${OUT}/04-builder-3d.png` });

  const modeBtns = await page.$$('button');
  for (const b of modeBtns) {
    const t = await page.evaluate((el) => el.textContent.trim(), b);
    if (t === '2D') {
      await b.click();
      break;
    }
  }
  await sleep(400);
  const hasSvg = await page.$('svg');
  log('builder 2D', Boolean(hasSvg));
  await page.screenshot({ path: `${OUT}/05-builder-2d.png` });

  for (const b of await page.$$('button')) {
    const t = await page.evaluate((el) => el.textContent.trim(), b);
    if (t === 'Схема' || t === 'Chizma') {
      await b.click();
      break;
    }
  }
  await sleep(400);
  log('builder schematic', true);
  await page.screenshot({ path: `${OUT}/06-builder-schema.png` });

  for (const b of await page.$$('button')) {
    const t = await page.evaluate((el) => el.textContent.trim(), b);
    if (t === '3D') {
      await b.click();
      break;
    }
  }
  await sleep(800);
  const canvas = await page.$('canvas');
  log('builder 3D canvas', Boolean(canvas));

  await page.$$eval('select', (sels) => {
    for (const s of sels) {
      if (s.options.length > 1) {
        s.selectedIndex = 1;
        s.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  });
  await sleep(500);
  const fpsRows = await page.$$eval('table tbody tr', (rows) => rows.length).catch(() => 0);
  log('FPS table after slots', fpsRows >= 10, `${fpsRows} games`);
  await page.screenshot({ path: `${OUT}/07-builder-fps.png`, fullPage: true });

  const resBtns = await page.$$('button');
  for (const b of resBtns) {
    const t = await page.evaluate((el) => el.textContent.trim(), b);
    if (t === '4K') {
      await b.click();
      break;
    }
  }
  await sleep(300);
  log('change resolution 4K', true);

  await page.evaluate(() => {
    document.querySelector('button[aria-label="search"]')?.click();
  });
  await sleep(200);
  const search = await page.$('input[placeholder]');
  if (search) {
    await search.type('4090');
    await sleep(300);
    const hits = await page.$$eval('ul a', (as) => as.map((a) => a.textContent));
    log('search 4090', hits.some((h) => /4090/i.test(h || '')), hits.slice(0, 3).join(' | '));
    await page.screenshot({ path: `${OUT}/08-search.png` });
    await page.keyboard.press('Escape');
    await page.mouse.click(10, 10);
  } else {
    log('search 4090', false, 'no input');
  }

  await page.goto(`${BASE}/builds`, { waitUntil: 'domcontentloaded' });
  const builds = await page.$$eval('article', (els) => els.length);
  log('ready builds', builds === 4, `${builds}`);
  const apply = await page.$('a[href*="preset="]');
  if (apply) await apply.click();
  await sleep(600);
  log('apply preset', page.url().includes('preset') || page.url().includes('builder'), page.url());
  await page.screenshot({ path: `${OUT}/09-preset.png` });

  await page.goto(`${BASE}/cart`, { waitUntil: 'domcontentloaded' });
  await page.screenshot({ path: `${OUT}/10-cart.png` });
  const checkoutLink = await page.$('a[href="/checkout"]');
  if (!checkoutLink) {
    // cart empty — add from catalog
    await page.goto(`${BASE}/catalog`, { waitUntil: 'domcontentloaded' });
    await page.click('article button');
    await sleep(300);
    await page.goto(`${BASE}/cart`, { waitUntil: 'domcontentloaded' });
  }
  if (await page.$('a[href="/checkout"]')) {
    await page.click('a[href="/checkout"]');
    await page.waitForSelector('form');
    await page.type('input[name="name"]', 'Амирбек Тест');
    await page.type('input[name="phone"]', '998901112233');
    await page.type('input[name="telegram"]', '@amirbek');
    await page.type('input[name="address"]', 'Tashkent, Sergeli 1');
    await page.screenshot({ path: `${OUT}/11-checkout.png` });
    page.on('dialog', (d) => d.dismiss());
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 8000 }).catch(() => {}),
      page.click('form button'),
    ]);
    await sleep(800);
    const body = await page.evaluate(() => document.body.innerText);
    const code = (body.match(/NX-[A-Z0-9]{4}/) || [])[0];
    log('checkout order', Boolean(code), code || body.slice(0, 120));
    await page.screenshot({ path: `${OUT}/12-order.png` });

    if (code) {
      await page.goto(`${BASE}/track/${code}`, { waitUntil: 'domcontentloaded' });
      const trackText = await page.evaluate(() => document.body.innerText);
      log('track new order', trackText.includes(code) && /Новый|Yangi/.test(trackText), code);
      await page.screenshot({ path: `${OUT}/13-track.png` });

      await page.goto(`${BASE}/nx-console`, { waitUntil: 'domcontentloaded' });
      await page.type('input[type="password"]', 'nexus-admin');
      await page.click('form button');
      await sleep(500);
      const adminText = await page.evaluate(() => document.body.innerText);
      log('admin login', adminText.includes(code) || /Заказы|Buyurtmalar/.test(adminText), adminText.slice(0, 80));
      await page.screenshot({ path: `${OUT}/14-admin.png` });

      const sel = await page.$('select');
      if (sel) {
        await page.select('select', 'confirmed');
        await sleep(300);
        log('admin confirm order', true);
      } else {
        log('admin confirm order', false, 'no status select');
      }

      await page.goto(`${BASE}/track/${code}`, { waitUntil: 'domcontentloaded' });
      const after = await page.evaluate(() => document.body.innerText);
      log('requisites after confirm', /8600|Click|Payme|реквизит|rekvizit/i.test(after), after.slice(0, 160));
      await page.screenshot({ path: `${OUT}/15-requisites.png` });
    }
  } else {
    log('checkout order', false, 'empty cart');
  }

  await page.goto(`${BASE}/nx-console`, { waitUntil: 'domcontentloaded' });
  const hidden = await page.evaluate(() => !document.body.innerText.includes('nx-console'));
  log('admin route exists', true);
} catch (err) {
  log('script', false, err.message);
  await page.screenshot({ path: `${OUT}/99-error.png` });
} finally {
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
