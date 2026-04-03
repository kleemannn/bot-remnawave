import { ConsoleLogger, Injectable } from '@nestjs/common';

@Injectable()
export class AppLoggerService extends ConsoleLogger {
  constructor() {
    super(undefined, {
      timestamp: true,
      logLevels: ['log', 'error', 'warn', 'debug', 'verbose'],
    });
  }
}
