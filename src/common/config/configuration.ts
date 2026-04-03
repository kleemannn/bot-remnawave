export default () => ({
  app: {
    port: Number(process.env.PORT ?? 3000),
    nodeEnv: process.env.NODE_ENV ?? 'development',
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    adminIds: (process.env.ADMIN_TELEGRAM_IDS ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  },
  remnawave: {
    baseUrl: process.env.REMNAWAVE_API_BASE_URL,
    token: process.env.REMNAWAVE_API_TOKEN,
    standardSquadId: process.env.STANDARD_SQUAD_ID,
    premiumSquadId: process.env.PREMIUM_SQUAD_ID,
    timeoutMs: Number(process.env.REMNAWAVE_TIMEOUT_MS ?? 10000),
  },
  happ: {
    cryptoApiUrl: process.env.HAPP_CRYPTO_API_URL ?? 'https://crypto.happ.su/api-v2.php',
    timeoutMs: Number(process.env.HAPP_CRYPTO_TIMEOUT_MS ?? 10000),
  },
});
