import { plainToInstance } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
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
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
