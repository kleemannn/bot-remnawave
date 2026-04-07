import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AppLoggerService } from './common/logger/app-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  const configService = app.get(ConfigService);
  const logger = app.get(AppLoggerService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: true,
    }),
  );
  app.useLogger(logger);
  const allowedOrigins =
    configService.get<string[]>('webapp.allowedOrigins', []) ?? [];

  if (allowedOrigins.length > 0) {
    app.enableCors({
      origin: allowedOrigins,
      credentials: true,
    });
  }

  app.enableShutdownHooks();

  const port = configService.get<number>('app.port', 3000);
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');
  const version = configService.get<string>('app.version', 'unknown');

  await app.listen(port, '0.0.0.0');

  logger.logEvent('app_bootstrap_complete', {
    port,
    nodeEnv,
    version,
    healthUrl: `http://0.0.0.0:${port}/health`,
    readyUrl: `http://0.0.0.0:${port}/health/ready`,
  }, 'Bootstrap');
}

void bootstrap();
