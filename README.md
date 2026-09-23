# NEXUS PC

Демо-магазин комплектующих и конфигуратор ПК: виды **2D / 3D / схема сверху**, расчёт FPS, корзина, оплата через Telegram, языки **RU / UZ**, валюта **so'm**.

## Запуск

```bash
npm install
npm run dev
```

Сборка: `npm run build` · предпросмотр: `npm run preview`.

## Скрытая админка

- URL: `/nx-console` (в меню нет)
- пароль по умолчанию: `nexus-admin`
- после 5 ошибок вход блокируется на 30 секунд
- можно сменить пароль во вкладке «Витрина»

## Telegram

Бот по умолчанию: [@nnexuspcbot](https://t.me/nnexuspcbot) (токен уже прописан в настройках).

Чтобы заказы приходили в Telegram:

1. Напишите боту `/start` с аккаунта, куда нужны заказы.
2. Узнайте свой `chat_id` (например через `@userinfobot`) и вставьте его в админке `/nx-console` → «Telegram и оплата».
3. Если заданы **bot token** + **chat_id**, заказ уходит боту через Telegram Bot API. Иначе открывается share-ссылка.

После статуса «подтверждён» клиент видит реквизиты карты / Click / Payme на странице трекинга.

## Данные

Каталог, игры, заказы и настройки хранятся в `localStorage` браузера. Это демо без backend.

## Стек

Vite, React, TypeScript, Tailwind, Zustand, react-i18next, React Three Fiber.
