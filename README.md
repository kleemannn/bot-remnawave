# Remnawave Dealer Bot

Production-ready Telegram dealer bot for Remnawave on single VPS.

## Stack

- Node.js 20+
- TypeScript
- NestJS
- Prisma ORM
- PostgreSQL
- Telegraf (`nestjs-telegraf`)
- pnpm
- Docker + Docker Compose
- Caddy (existing, optional for reverse proxy)

## Project Structure

```text
.
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app.controller.ts
│   ├── app.module.ts
│   ├── main.ts
│   ├── auth/
│   │   ├── auth.module.ts
│   │   └── auth.service.ts
│   ├── bot/
│   │   ├── bot.module.ts
│   │   ├── bot.update.ts
│   │   └── interfaces/
│   │       └── bot-context.interface.ts
│   ├── common/
│   │   ├── config/
│   │   │   ├── configuration.ts
│   │   │   └── env.validation.ts
│   │   ├── guards/
│   │   │   ├── admin.guard.ts
│   │   │   └── dealer.guard.ts
│   │   └── logger/
│   │       ├── app-logger.service.ts
│   │       └── logger.module.ts
│   ├── dealers/
│   │   ├── dto/
│   │   │   ├── add-dealer.dto.ts
│   │   │   └── update-tag.dto.ts
│   │   ├── dealers.module.ts
│   │   └── dealers.service.ts
│   ├── notifications/
│   │   ├── notifications.module.ts
│   │   └── notifications.service.ts
│   ├── happ/
│   │   ├── happ.module.ts
│   │   └── happ-crypto.service.ts
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   ├── remnawave/
│   │   ├── adapters/
│   │   │   └── remnawave.adapter.ts
│   │   ├── dto/
│   │   │   └── create-remnawave-user.dto.ts
│   │   ├── remnawave.module.ts
│   │   └── remnawave.service.ts
│   └── subscriptions/
│       ├── dto/
│       │   └── create-subscription.dto.ts
│       ├── subscriptions.module.ts
│       └── subscriptions.service.ts
├── .env.example
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## Environment

Copy and edit env:

```bash
cp .env.example .env
```

Required variables:

- `TELEGRAM_BOT_TOKEN`
- `ADMIN_TELEGRAM_IDS` (comma-separated Telegram IDs)
- `REMNAWAVE_API_BASE_URL`
- `REMNAWAVE_API_TOKEN`
- `STANDARD_SQUAD_ID`
- `PREMIUM_SQUAD_ID`
- `DATABASE_URL`
- `HAPP_CRYPTO_API_URL` (optional, default `https://crypto.happ.su/api-v2.php`)
- `HAPP_CRYPTO_TIMEOUT_MS` (optional)

For setup with existing Remnawave container on same VPS:

- `REMNAWAVE_API_BASE_URL=http://remnawave:3000/api`
- Bot service must be attached to external docker network `remnawave-network`.

## Deploy (Single VPS)

```bash
docker compose up -d --build
```

Healthcheck:

```bash
curl http://127.0.0.1:3010/health
```

If external network is missing, create it once:

```bash
docker network create remnawave-network
```

If you use Caddy on host, proxy bot to local port:

```caddy
bot.yourdomain.com {
    reverse_proxy 127.0.0.1:3010
}
```

## Telegram Commands (RU UI)

### Admin

- `/add_dealer <tg_id> <username> <standard|premium> <days> <limit>`
- `/delete_dealer <tg_id>`
- `/dealer_on <tg_id>`
- `/dealer_off <tg_id>`
- `/set_tag <tg_id> <standard|premium>`
- `/set_limit <tg_id> <limit>`
- `/extend <tg_id> <days>`
- `/stats`

### Dealer

- `/me`
- `/create` (interactive: username -> days)
- `/my_subs`
- `/delete <subscription_id>`
- `/pause <subscription_id>`
- `/resume <subscription_id>`
- `/expiry <subscription_id>`

After `/create`, bot returns encrypted HAPP link (`happ://...`) when Remnawave response includes source subscription URL.

## Security Notes

- Remnawave API token only in `.env`.
- Admin access controlled by `ADMIN_TELEGRAM_IDS` whitelist.
- Dealer commands allowed only for registered dealers.
- Input validation via DTO + `class-validator`.
- No sensitive token output in bot replies.

## Remnawave API Adapter

Unknown/variable Remnawave API payload fields are isolated in:

- `src/remnawave/adapters/remnawave.adapter.ts`

Update TODO mappings there without touching business logic.

## Notification Scheduler

- Cron runs daily at `10:00` server time.
- Sends reminders before dealer expiration at 7, 3, 1 day.
- Writes send history into `notifications` table.

## Operational Notes

- Bot runs as single NestJS monolith.
- PostgreSQL and bot are in one compose stack.
- Bot listens on `127.0.0.1:3010` on host (via Docker port mapping).
