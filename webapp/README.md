# Telegram Mini App

Отдельный фронтенд-пакет для дилерской панели внутри Telegram.

## Stack

- Next.js App Router
- React
- TailwindCSS
- Zustand
- Axios
- Telegram WebApp SDK через `window.Telegram.WebApp`

## Структура

```text
webapp/
  package.json
  .env.example
  src/
    app/
      dashboard/
      subscriptions/
      subscription/[id]/
      create/
      profile/
    components/
    lib/
    store/
```

## Запуск

```bash
cd webapp
npm install
npm run dev
```

## ENV

```bash
cp .env.example .env.local
```

- `NEXT_PUBLIC_API_BASE_URL` — URL вашего backend API
- `NEXT_PUBLIC_DEV_JWT` — optional JWT для локальной разработки вне Telegram
- `NEXT_PUBLIC_DEV_USERNAME` — optional имя для dev-режима
- `NEXT_PUBLIC_DEV_TELEGRAM_ID` — optional Telegram ID для dev-режима

## Ожидаемые backend endpoints

Mini App ожидает такие endpoints:

- `POST /webapp/auth`
- `GET /webapp/dashboard`
- `GET /webapp/profile`
- `GET /webapp/subscriptions?page=1`
- `GET /webapp/subscriptions/:id`
- `POST /webapp/subscriptions`
- `POST /webapp/subscriptions/:id/pause`
- `POST /webapp/subscriptions/:id/resume`
- `DELETE /webapp/subscriptions/:id`

## UX Notes

- mobile-first max width `480px`
- большие touch targets
- нижняя вкладочная навигация
- пошаговое создание подписки
- skeleton loading
- confirm sheet для опасных действий
- Telegram theme sync и `WebApp.expand()`
