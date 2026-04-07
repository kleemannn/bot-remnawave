export default () => ({
  app: {
    port: Number(process.env.PORT ?? 3000),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    logLevel: process.env.APP_LOG_LEVEL ?? 'log',
    healthcheckDbTimeoutMs: Number(process.env.HEALTHCHECK_DB_TIMEOUT_MS ?? 3000),
    version: process.env.APP_VERSION ?? process.env.npm_package_version ?? '1.0.0',
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    adminIds: (process.env.ADMIN_TELEGRAM_IDS ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
    throttling: {
      windowMs: Number(process.env.BOT_RATE_LIMIT_WINDOW_MS ?? 10000),
      maxTexts: Number(process.env.BOT_RATE_LIMIT_MAX_TEXTS ?? 12),
      maxCallbacks: Number(process.env.BOT_RATE_LIMIT_MAX_CALLBACKS ?? 24),
      maxCommands: Number(process.env.BOT_RATE_LIMIT_MAX_COMMANDS ?? 12),
      expensiveActionCooldownMs: Number(
        process.env.BOT_EXPENSIVE_ACTION_COOLDOWN_MS ?? 3000,
      ),
    },
  },
  remnawave: {
    baseUrl: process.env.REMNAWAVE_API_BASE_URL,
    token: process.env.REMNAWAVE_API_TOKEN,
    standardSquadId: process.env.STANDARD_SQUAD_ID,
    premiumSquadId: process.env.PREMIUM_SQUAD_ID,
    timeoutMs: Number(process.env.REMNAWAVE_TIMEOUT_MS ?? 10000),
    retryCount: Number(process.env.REMNAWAVE_RETRY_COUNT ?? 1),
    retryDelayMs: Number(process.env.REMNAWAVE_RETRY_DELAY_MS ?? 500),
  },
  happ: {
    cryptoApiUrl: process.env.HAPP_CRYPTO_API_URL ?? 'https://crypto.happ.su/api-v2.php',
    timeoutMs: Number(process.env.HAPP_CRYPTO_TIMEOUT_MS ?? 10000),
  },
});
