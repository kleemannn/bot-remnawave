import { ConsoleLogger, Injectable, LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type LogPayload = Record<string, unknown>;

@Injectable()
export class AppLoggerService extends ConsoleLogger {
  constructor(configService: ConfigService) {
    const configuredLevel = configService.get<string>('app.logLevel', 'log');
    const logLevels = buildLogLevels(configuredLevel);

    super('AppLogger', {
      timestamp: true,
      logLevels,
    });
  }

  logEvent(event: string, payload?: LogPayload, context?: string) {
    this.log(this.stringify(event, payload), context);
  }

  warnEvent(event: string, payload?: LogPayload, context?: string) {
    this.warn(this.stringify(event, payload), context);
  }

  errorEvent(event: string, payload?: LogPayload, trace?: string, context?: string) {
    this.error(this.stringify(event, payload), trace, context);
  }

  debugEvent(event: string, payload?: LogPayload, context?: string) {
    this.debug(this.stringify(event, payload), context);
  }

  private stringify(event: string, payload?: LogPayload) {
    return JSON.stringify({
      event,
      ...sanitizePayload(payload),
    });
  }
}

function buildLogLevels(level: string): LogLevel[] {
  switch (level) {
    case 'error':
      return ['error'];
    case 'warn':
      return ['error', 'warn'];
    case 'log':
      return ['error', 'warn', 'log'];
    case 'debug':
      return ['error', 'warn', 'log', 'debug'];
    case 'verbose':
      return ['error', 'warn', 'log', 'debug', 'verbose'];
    default:
      return ['error', 'warn', 'log'];
  }
}

function sanitizePayload(payload?: LogPayload): LogPayload | undefined {
  if (!payload) {
    return undefined;
  }

  const secretPatterns = ['token', 'authorization', 'password', 'secret'];

  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => {
      const lowerKey = key.toLowerCase();
      if (secretPatterns.some((pattern) => lowerKey.includes(pattern))) {
        return [key, '[REDACTED]'];
      }

      return [key, value];
    }),
  );
}
