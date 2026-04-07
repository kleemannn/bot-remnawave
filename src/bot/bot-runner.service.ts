import {
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { AppLoggerService } from '../common/logger/app-logger.service';
import { BotContext } from './interfaces/bot-context.interface';

@Injectable()
export class BotRunnerService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private launched = false;

  constructor(
    @InjectBot() private readonly bot: Telegraf<BotContext>,
    private readonly logger: AppLoggerService,
  ) {}

  async onApplicationBootstrap() {
    const me = await this.bot.telegram.getMe();
    await this.bot.launch();
    this.launched = true;

    this.logger.logEvent(
      'telegram_bot_polling_started',
      {
        botId: me.id,
        username: me.username,
      },
      BotRunnerService.name,
    );
  }

  async onApplicationShutdown() {
    if (!this.launched) {
      return;
    }

    this.bot.stop('application_shutdown');
    this.launched = false;

    this.logger.logEvent(
      'telegram_bot_polling_stopped',
      undefined,
      BotRunnerService.name,
    );
  }
}
