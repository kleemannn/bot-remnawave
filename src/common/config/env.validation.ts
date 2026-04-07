import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
  Max,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  TELEGRAM_BOT_TOKEN!: string;

  @IsString()
  @IsNotEmpty()
  ADMIN_TELEGRAM_IDS!: string;

  @IsString()
  @IsNotEmpty()
  REMNAWAVE_API_BASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  REMNAWAVE_API_TOKEN!: string;

  @IsString()
  @IsNotEmpty()
  STANDARD_SQUAD_ID!: string;

  @IsString()
  @IsNotEmpty()
  PREMIUM_SQUAD_ID!: string;

  @IsOptional()
  @IsInt()
  @Min(1000)
  REMNAWAVE_TIMEOUT_MS?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  HAPP_CRYPTO_API_URL?: string;

  @IsOptional()
  @IsInt()
  @Min(1000)
  HAPP_CRYPTO_TIMEOUT_MS?: number;

  @IsOptional()
  @Matches(/^\d+$/)
  PORT?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  APP_VERSION?: string;

  @IsOptional()
  @IsIn(['error', 'warn', 'log', 'debug', 'verbose'])
  APP_LOG_LEVEL?: string;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(60000)
  BOT_RATE_LIMIT_WINDOW_MS?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  BOT_RATE_LIMIT_MAX_TEXTS?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  BOT_RATE_LIMIT_MAX_CALLBACKS?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  BOT_RATE_LIMIT_MAX_COMMANDS?: number;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(60000)
  BOT_EXPENSIVE_ACTION_COOLDOWN_MS?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  REMNAWAVE_RETRY_COUNT?: number;

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(10000)
  REMNAWAVE_RETRY_DELAY_MS?: number;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(30000)
  HEALTHCHECK_DB_TIMEOUT_MS?: number;

  @IsString()
  @IsNotEmpty()
  WEBAPP_JWT_SECRET!: string;

  @IsOptional()
  @IsInt()
  @Min(300)
  @Max(604800)
  WEBAPP_JWT_TTL_SEC?: number;

  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(86400)
  WEBAPP_INIT_DATA_TTL_SEC?: number;

  @IsOptional()
  @IsString()
  WEBAPP_ALLOWED_ORIGINS?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, { skipMissingProperties: false });
  if (errors.length > 0) {
    const constraints = errors
      .flatMap((error) => Object.values(error.constraints ?? {}))
      .join('; ');
    throw new Error(`Ошибка валидации ENV: ${constraints}`);
  }
  return validatedConfig;
}
