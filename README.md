# Remnawave Dealer Bot

Telegram dealer bot for Remnawave on NestJS, Telegraf, Prisma and PostgreSQL. Проект рассчитан на один VPS и один compose-стек без лишней инфраструктуры.

## Что уже есть

- роли `admin` / `dealer`
- теги дилеров `standard` / `premium`
- лимиты ключей и срок доступа дилера
- создание, пауза, возобновление и удаление подписок
- Remnawave API integration
- напоминания о скором окончании доступа дилера
- health endpoints
- rate limiting и защита от повторных кликов
- structured logging и audit trail

## Структура

```text
src/
  app.module.ts
  main.ts
  health/
  auth/
  bot/
  common/
    audit/
    config/
    errors/
    guards/
    logger/
    utils/
  dealers/
  notifications/
  prisma/
  remnawave/
  subscriptions/
prisma/schema.prisma
Dockerfile
docker-compose.yml
.env.example
```

## ENV

Скопируйте шаблон и заполните реальные значения:

```bash
cp .env.example .env
```

Обязательные переменные:

- `DATABASE_URL`
- `TELEGRAM_BOT_TOKEN`
- `ADMIN_TELEGRAM_IDS`
- `REMNAWAVE_API_BASE_URL`
- `REMNAWAVE_API_TOKEN`
- `STANDARD_SQUAD_ID`
- `PREMIUM_SQUAD_ID`

Полезные production-переменные:

- `APP_LOG_LEVEL=log`
- `REMNAWAVE_TIMEOUT_MS=10000`
- `REMNAWAVE_RETRY_COUNT=1`
- `REMNAWAVE_RETRY_DELAY_MS=500`
- `BOT_RATE_LIMIT_WINDOW_MS=10000`
- `BOT_RATE_LIMIT_MAX_TEXTS=12`
- `BOT_RATE_LIMIT_MAX_CALLBACKS=24`
- `BOT_RATE_LIMIT_MAX_COMMANDS=12`
- `BOT_EXPENSIVE_ACTION_COOLDOWN_MS=3000`
- `HEALTHCHECK_DB_TIMEOUT_MS=3000`

## Deploy На VPS

Если внешняя docker-сеть для Remnawave еще не создана:

```bash
docker network create remnawave-network
```

Обычный деплой:

```bash
git pull
docker compose build --no-cache bot
docker compose up -d --force-recreate bot
docker compose logs -f bot
```

Первый запуск всей пачки:

```bash
docker compose up -d --build
```

## Health И Runtime Проверки

Приложение слушает `127.0.0.1:3011` на хосте.

Проверки:

```bash
curl http://127.0.0.1:3011/health
curl http://127.0.0.1:3011/health/ready
```

Что проверяет:

- `/health` — liveness
- `/health/ready` — готовность приложения и доступность PostgreSQL

## Логи

Логи теперь структурированы по событиям:

- `app_bootstrap_complete`
- `prisma_connected`
- `remnawave_request_*`
- `bot_handler_error`
- `dealer_expiry_reminders_*`
- `bot_admin_access_denied`
- `bot_dealer_access_denied`

Полезные команды:

```bash
docker compose logs -f bot
docker compose logs --tail=200 bot
docker compose logs -f postgres
```

В логах не должны появляться токены, пароли и `Authorization` headers.

## Safety И Abuse Protection

- Входящие сообщения и callback-и ограничены rate limit-ом.
- Дорогие операции защищены от повторных кликов коротким cooldown.
- UI-ограничения дублируются server-side проверками.
- Дилер не может получить чужую подписку даже через crafted callback.
- Ошибки Remnawave не отдаются пользователю raw stack trace-ом.

## Audit Trail

В `audit_logs` пишутся как минимум:

- создание / удаление дилера
- активация / деактивация дилера
- изменение тега
- изменение лимита
- изменение срока доступа
- создание / пауза / возобновление / удаление подписки
- отправка системных reminder-ов

Запись содержит:

- `actorId`
- `action`
- `entity`
- `entityId`
- `metadata`

В `metadata` хранится `actorRole`, `success`, `previousState`, `newState`, `details`.

## Миграции

Для production безопаснее использовать deploy-команду Prisma:

```bash
docker compose exec bot pnpm run prisma:deploy
```

Если вы меняете `schema.prisma`, порядок такой:

1. Локально создать migration.
2. Закоммитить `prisma/migrations`.
3. На VPS выполнить `docker compose up -d --build`.

## Резервные Копии

Бэкап базы:

```bash
docker compose exec postgres pg_dump -U remna_user remna_bot > backup-$(date +%F-%H%M).sql
```

Восстановление:

```bash
cat backup.sql | docker compose exec -T postgres psql -U remna_user -d remna_bot
```

Практично хранить как минимум:

- ежедневный dump БД
- `.env` вне git
- список последних рабочих коммитов

## Remnawave Integration

Что важно:

- создание пользователя не ретраится автоматически, чтобы не плодить дубликаты при сетевой неопределенности
- безопасные операции (`GET`, `DELETE`, `enable`, `disable`, `update expiry`) могут быть повторены ограниченно
- 404 от Remnawave на проверке пользователя трактуется как отсутствие пользователя

## Частые Операционные Команды

Проверка контейнеров:

```bash
docker compose ps
```

Проверка последнего коммита:

```bash
git log -1 --oneline
```

Перезапуск только бота:

```bash
docker compose up -d --force-recreate bot
```

## Замечание По Секретам

Если реальные токены когда-либо попадали в git, считайте их скомпрометированными:

- перевыпустите Telegram bot token через `@BotFather`
- создайте новый Remnawave API token
- обновите `.env` на VPS
