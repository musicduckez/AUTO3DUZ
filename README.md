# NEXUS PC

Магазин комплектующих и конфигуратор ПК: виды **2D / 3D / схема сверху**, расчёт FPS, корзина, оплата через Telegram, языки **RU / UZ**, валюта **so'm**.

Стек: **Vite + React + TypeScript + Tailwind + Zustand + i18next + R3F**, backend на **Vercel Serverless** + **Neon Postgres**.

## Локальный запуск

```bash
npm install
npm run dev
```

Сборка: `npm run build` · предпросмотр: `npm run preview`.

## Деплой Vercel + Neon

1. Создайте Neon DB (или claimable: `curl -X POST https://neon.new/api/v1/database -H 'Content-Type: application/json' -d '{"ref":"nexus-pc"}'`).
2. Пропишите env:

```bash
DATABASE_URL=postgresql://...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

3. Задеплойте:

Временный деплой без логина Vercel:

```bash
npm run deploy:temp
```

Прод (нужен `vercel login`):

```bash
npx vercel deploy --prod \
  -e DATABASE_URL="$DATABASE_URL" \
  -e TELEGRAM_BOT_TOKEN="$TELEGRAM_BOT_TOKEN" \
  -e TELEGRAM_CHAT_ID="$TELEGRAM_CHAT_ID"
```

API routes:

| Method | Path | Описание |
|--------|------|----------|
| GET | `/api/health` | проверка Neon + Telegram env |
| GET/PUT | `/api/settings` | реквизиты / промо |
| GET/POST | `/api/orders` | список / создание заказа |
| GET/PATCH | `/api/orders/:code` | трекинг / статус / чек |
| POST | `/api/telegram-send` | прокси текста в бот |
| POST | `/api/telegram-photo` | прокси чека в бот |
| GET | `/api/stripe/config` | доступность Stripe + курс UZS→USD |
| POST | `/api/stripe/checkout` | создать Checkout Session по коду заказа |
| GET | `/api/stripe/confirm` | подтвердить оплату после возврата со Stripe |
| POST | `/api/stripe/webhook` | webhook `checkout.session.completed` |

Оплата: **Stripe Checkout** (карта, USD; so'm конвертируется по `UZS_PER_USD`, по умолчанию 12500) или перевод на локальную карту + чек.

| GET | `/api/payme/config` | доступность Payme |
| POST | `/api/payme/checkout` | ссылка на оплату Payme по коду заказа |
| POST | `/api/payme` | Merchant API callback (JSON-RPC) |

Оплата: **Stripe** (USD), **Payme** (so'm / tiyin), или перевод на локальную карту + чек.

Env для Payme: `PAYME_MERCHANT_ID`, `PAYME_MERCHANT_KEY`, опционально `PAYME_TEST=1` (sandbox `test.paycom.uz`), `PAYME_LOGIN` (по умолчанию `Paycom`). В кабинете Payme Business укажите Endpoint URL: `https://YOUR_HOST/api/payme`, поле аккаунта: `order_id`.

## Скрытая админка

- URL: `/nx-console` (в меню нет)
- пароль по умолчанию: `nexus-admin`
- после 5 ошибок вход блокируется на 30 секунд

## Telegram

Бот по умолчанию: [@nnexuspcbot](https://t.me/nnexuspcbot).

На проде токен и `chat_id` задаются через env Vercel. В админке можно переопределить.

После оформления заказ пишется в Neon и уходит в Telegram. Клиент оплачивает через **Stripe** или переводом на карту (+ чек) на `/track/:code`.
