import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { TelegrafExecutionContext } from 'nestjs-telegraf';
import { AuthService } from '../../auth/auth.service';
import { BotContext } from '../../bot/interfaces/bot-context.interface';

@Injectable()
export class DealerGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const tgCtx = TelegrafExecutionContext.create(context).getContext<BotContext>();
    const userId = tgCtx.from?.id;

    if (!userId) {
      return false;
    }

    const dealer = await this.authService.getDealerByTelegramId(BigInt(userId));
    if (!dealer) {
      await tgCtx.reply('Вы не зарегистрированы как дилер.');
      return false;
    }

    return true;
  }
}
