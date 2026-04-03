import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { TelegrafExecutionContext } from 'nestjs-telegraf';
import { AuthService } from '../../auth/auth.service';
import { BotContext } from '../../bot/interfaces/bot-context.interface';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const tgCtx = TelegrafExecutionContext.create(context).getContext<BotContext>();
    const userId = tgCtx.from?.id;

    if (!userId) {
      return false;
    }

    const isAdmin = this.authService.isAdmin(BigInt(userId));
    if (!isAdmin) {
      await tgCtx.reply('Доступ запрещен. Команда только для администраторов.');
      return false;
    }

    await this.authService.upsertAdmin(BigInt(userId), tgCtx.from?.username);
    return true;
  }
}
