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

В админке укажите username магазина. Если заданы **bot token** и **chat_id**, заказ уходит боту через Telegram Bot API (без своего сервера). Иначе открывается share-ссылка Telegram.

После статуса «подтверждён» клиент видит реквизиты карты / Click / Payme на странице трекинга.

## Данные

Каталог, игры, заказы и настройки хранятся в `localStorage` браузера. Это демо без backend.

## Стек

Vite, React, TypeScript, Tailwind, Zustand, react-i18next, React Three Fiber.
