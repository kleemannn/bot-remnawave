import { UseGuards } from '@nestjs/common';
import { Command, Ctx, On, Start, Update } from 'nestjs-telegraf';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DealerTag } from '@prisma/client';
import dayjs from 'dayjs';
import { AuthService } from '../auth/auth.service';
import { DealersService } from '../dealers/dealers.service';
import { AddDealerDto } from '../dealers/dto/add-dealer.dto';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CreateSubscriptionDto } from '../subscriptions/dto/create-subscription.dto';
import { AdminGuard } from '../common/guards/admin.guard';
import { DealerGuard } from '../common/guards/dealer.guard';
import { BotContext } from './interfaces/bot-context.interface';

@Update()
export class BotUpdate {
  constructor(
    private readonly authService: AuthService,
    private readonly dealersService: DealersService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Start()
  async onStart(@Ctx() ctx: BotContext) {
    const userId = this.getTelegramId(ctx);
    const isAdmin = this.authService.isAdmin(userId);
    const dealer = await this.authService.getDealerByTelegramId(userId);

    const lines: string[] = [
      'Добро пожаловать в Remnawave Dealer Bot.',
      '',
      'Базовые команды:',
      '/help - показать команды',
    ];

    if (isAdmin) {
      lines.push('', 'Админ-команды:');
      lines.push('/add_dealer <tg_id> <username> <standard|premium> <days> <limit>');
      lines.push('/delete_dealer <tg_id>');
      lines.push('/dealer_on <tg_id>');
      lines.push('/dealer_off <tg_id>');
      lines.push('/set_tag <tg_id> <standard|premium>');
      lines.push('/set_limit <tg_id> <limit>');
      lines.push('/extend <tg_id> <days>');
      lines.push('/stats');
    }

    if (dealer) {
      lines.push('', 'Дилер-команды:');
      lines.push('/me');
      lines.push('/create');
      lines.push('/my_subs');
      lines.push('/delete <subscription_id>');
      lines.push('/pause <subscription_id>');
      lines.push('/resume <subscription_id>');
      lines.push('/expiry <subscription_id>');
    }

    await ctx.reply(lines.join('\n'));
  }

  @Command('help')
  async onHelp(@Ctx() ctx: BotContext) {
    await this.onStart(ctx);
  }

  @UseGuards(AdminGuard)
  @Command('add_dealer')
  async addDealer(@Ctx() ctx: BotContext) {
    try {
      const args = this.commandArgs(ctx);
      if (args.length < 5) {
        await ctx.reply('Формат: /add_dealer <tg_id> <username> <standard|premium> <days> <limit>');
        return;
      }

      const dto = plainToInstance(AddDealerDto, {
        telegramId: args[0],
        username: args[1],
        tag: args[2].toUpperCase(),
        accessDays: Number(args[3]),
        keyLimit: Number(args[4]),
      });

      const errors = await validate(dto);
      if (errors.length > 0) {
        await ctx.reply('Ошибка валидации. Проверьте формат команды.');
        return;
      }

      const dealer = await this.dealersService.addDealer(dto, this.getTelegramId(ctx));

      await ctx.reply(
        `Дилер сохранен:\nID: ${dealer.telegramId.toString()}\nТег: ${dealer.tag.toLowerCase()}\nЛимит: ${dealer.keyLimit}\nДо: ${dayjs(dealer.expiresAt).format('YYYY-MM-DD HH:mm')}`,
      );
    } catch (error) {
      await this.replyError(ctx, error);
    }
  }

  @UseGuards(AdminGuard)
  @Command('delete_dealer')
  async deleteDealer(@Ctx() ctx: BotContext) {
    try {
      const args = this.commandArgs(ctx);
      if (args.length < 1 || !/^\d+$/.test(args[0])) {
        await ctx.reply('Формат: /delete_dealer <tg_id>');
        return;
      }

      await this.dealersService.deleteDealer(BigInt(args[0]), this.getTelegramId(ctx));
      await ctx.reply('Дилер удален.');
    } catch (error) {
      await this.replyError(ctx, error);
    }
  }

  @UseGuards(AdminGuard)
  @Command('dealer_on')
  async dealerOn(@Ctx() ctx: BotContext) {
    await this.setDealerActive(ctx, true);
  }

  @UseGuards(AdminGuard)
  @Command('dealer_off')
  async dealerOff(@Ctx() ctx: BotContext) {
    await this.setDealerActive(ctx, false);
  }

  @UseGuards(AdminGuard)
  @Command('set_tag')
  async setTag(@Ctx() ctx: BotContext) {
    try {
      const args = this.commandArgs(ctx);
      if (args.length < 2 || !/^\d+$/.test(args[0])) {
        await ctx.reply('Формат: /set_tag <tg_id> <standard|premium>');
        return;
      }

      const inputTag = args[1].toUpperCase();
      if (inputTag !== DealerTag.STANDARD && inputTag !== DealerTag.PREMIUM) {
        await ctx.reply('Тег должен быть standard или premium.');
        return;
      }

      const dealer = await this.dealersService.setTag(
        BigInt(args[0]),
        inputTag as DealerTag,
        this.getTelegramId(ctx),
      );

      await ctx.reply(`Тег обновлен: ${dealer.tag.toLowerCase()}`);
    } catch (error) {
      await this.replyError(ctx, error);
    }
  }

  @UseGuards(AdminGuard)
  @Command('set_limit')
  async setLimit(@Ctx() ctx: BotContext) {
    try {
      const args = this.commandArgs(ctx);
      if (args.length < 2 || !/^\d+$/.test(args[0]) || !/^\d+$/.test(args[1])) {
        await ctx.reply('Формат: /set_limit <tg_id> <limit>');
        return;
      }

      const dealer = await this.dealersService.setKeyLimit(
        BigInt(args[0]),
        Number(args[1]),
        this.getTelegramId(ctx),
      );

      await ctx.reply(`Новый лимит: ${dealer.keyLimit}`);
    } catch (error) {
      await this.replyError(ctx, error);
    }
  }

  @UseGuards(AdminGuard)
  @Command('extend')
  async extend(@Ctx() ctx: BotContext) {
    try {
      const args = this.commandArgs(ctx);
      if (args.length < 2 || !/^\d+$/.test(args[0]) || !/^\d+$/.test(args[1])) {
        await ctx.reply('Формат: /extend <tg_id> <days>');
        return;
      }

      const dealer = await this.dealersService.extendAccess(
        BigInt(args[0]),
        Number(args[1]),
        this.getTelegramId(ctx),
      );

      await ctx.reply(`Доступ продлен до ${dayjs(dealer.expiresAt).format('YYYY-MM-DD HH:mm')}`);
    } catch (error) {
      await this.replyError(ctx, error);
    }
  }

  @UseGuards(AdminGuard)
  @Command('stats')
  async stats(@Ctx() ctx: BotContext) {
    try {
      const stats = await this.dealersService.getStats();
      await ctx.reply(
        [
          'Статистика дилеров:',
          `Всего: ${stats.total}`,
          `Активных: ${stats.active}`,
          `Истекших: ${stats.expired}`,
          `Premium: ${stats.premium}`,
          `Standard: ${stats.standard}`,
        ].join('\n'),
      );
    } catch (error) {
      await this.replyError(ctx, error);
    }
  }

  @UseGuards(DealerGuard)
  @Command('me')
  async myProfile(@Ctx() ctx: BotContext) {
    try {
      const dealer = await this.dealersService.getDealerByTelegramId(this.getTelegramId(ctx));
      if (!dealer) {
        await ctx.reply('Профиль дилера не найден.');
        return;
      }

      await ctx.reply(
        [
          'Ваш профиль:',
          `Тег: ${dealer.tag.toLowerCase()}`,
          `Активен: ${dealer.isActive ? 'да' : 'нет'}`,
          `Доступ до: ${dayjs(dealer.expiresAt).format('YYYY-MM-DD HH:mm')}`,
          `Лимит ключей: ${dealer.keyLimit}`,
          `Создано: ${dealer.createdCount}`,
        ].join('\n'),
      );
    } catch (error) {
      await this.replyError(ctx, error);
    }
  }

  @UseGuards(DealerGuard)
  @Command('create')
  async createSubscription(@Ctx() ctx: BotContext) {
    ctx.session.createFlow = { step: 'username' };
    await ctx.reply('Введите username для новой подписки:');
  }

  @UseGuards(DealerGuard)
  @Command('my_subs')
  async mySubscriptions(@Ctx() ctx: BotContext) {
    try {
      const items = await this.subscriptionsService.listByDealer(this.getTelegramId(ctx));
      if (items.length === 0) {
        await ctx.reply('У вас пока нет подписок.');
        return;
      }

      const lines = items.map(
        (sub) =>
          `ID: ${sub.id}\nUser: ${sub.dealerUser.username}\nСтатус: ${sub.status.toLowerCase()}\nДо: ${dayjs(sub.expiresAt).format('YYYY-MM-DD HH:mm')}`,
      );

      await ctx.reply(lines.join('\n\n'));
    } catch (error) {
      await this.replyError(ctx, error);
    }
  }

  @UseGuards(DealerGuard)
  @Command('delete')
  async deleteSubscription(@Ctx() ctx: BotContext) {
    try {
      const args = this.commandArgs(ctx);
      if (args.length < 1) {
        await ctx.reply('Формат: /delete <subscription_id>');
        return;
      }

      await this.subscriptionsService.deleteSubscription(this.getTelegramId(ctx), args[0]);
      await ctx.reply('Подписка удалена.');
    } catch (error) {
      await this.replyError(ctx, error);
    }
  }

  @UseGuards(DealerGuard)
  @Command('pause')
  async pauseSubscription(@Ctx() ctx: BotContext) {
    try {
      const args = this.commandArgs(ctx);
      if (args.length < 1) {
        await ctx.reply('Формат: /pause <subscription_id>');
        return;
      }

      const sub = await this.subscriptionsService.pauseSubscription(
        this.getTelegramId(ctx),
        args[0],
      );
      await ctx.reply(
        `Подписка поставлена на паузу. Остаток: ${sub.remainingSeconds} секунд.`,
      );
    } catch (error) {
      await this.replyError(ctx, error);
    }
  }

  @UseGuards(DealerGuard)
  @Command('resume')
  async resumeSubscription(@Ctx() ctx: BotContext) {
    try {
      const args = this.commandArgs(ctx);
      if (args.length < 1) {
        await ctx.reply('Формат: /resume <subscription_id>');
        return;
      }

      const sub = await this.subscriptionsService.resumeSubscription(
        this.getTelegramId(ctx),
        args[0],
      );
      await ctx.reply(
        `Подписка возобновлена. Новый срок: ${dayjs(sub.expiresAt).format('YYYY-MM-DD HH:mm')}`,
      );
    } catch (error) {
      await this.replyError(ctx, error);
    }
  }

  @UseGuards(DealerGuard)
  @Command('expiry')
  async getExpiry(@Ctx() ctx: BotContext) {
    try {
      const args = this.commandArgs(ctx);
      if (args.length < 1) {
        await ctx.reply('Формат: /expiry <subscription_id>');
        return;
      }

      const sub = await this.subscriptionsService.getSubscriptionExpiry(
        this.getTelegramId(ctx),
        args[0],
      );

      await ctx.reply(
        [
          `ID: ${sub.id}`,
          `Статус: ${sub.status.toLowerCase()}`,
          `Срок: ${dayjs(sub.expiresAt).format('YYYY-MM-DD HH:mm')}`,
          `Остаток (сек): ${sub.remainingSeconds ?? '-'}`,
        ].join('\n'),
      );
    } catch (error) {
      await this.replyError(ctx, error);
    }
  }

  @UseGuards(DealerGuard)
  @On('text')
  async onText(@Ctx() ctx: BotContext) {
    const text = (ctx.message as { text?: string })?.text?.trim();
    if (!text || text.startsWith('/')) {
      return;
    }

    const flow = ctx.session.createFlow;
    if (!flow) {
      return;
    }

    if (flow.step === 'username') {
      if (!/^[A-Za-z0-9_.-]{3,64}$/.test(text)) {
        await ctx.reply('Некорректный username. Допустимы A-Za-z0-9_.- длина 3-64.');
        return;
      }

      ctx.session.createFlow = {
        step: 'days',
        username: text,
      };

      await ctx.reply('Введите количество дней (целое число):');
      return;
    }

    if (flow.step === 'days') {
      const days = Number(text);
      if (!Number.isInteger(days) || days <= 0) {
        await ctx.reply('Дни должны быть положительным целым числом.');
        return;
      }

      const dto = plainToInstance(CreateSubscriptionDto, {
        username: flow.username,
        days,
      });

      const errors = await validate(dto);
      if (errors.length > 0) {
        await ctx.reply('Ошибка валидации данных подписки.');
        return;
      }

      try {
        const result = await this.subscriptionsService.createForDealer(
          this.getTelegramId(ctx),
          dto,
        );

        ctx.session.createFlow = undefined;

        const lines = [
          'Подписка создана.',
          `ID: ${result.subscription.id}`,
          `Срок: ${dayjs(result.subscription.expiresAt).format('YYYY-MM-DD HH:mm')}`,
        ];

        if (result.happEncryptedUrl) {
          lines.push(`HAPP (зашифровано): ${result.happEncryptedUrl}`);
        } else if (result.subscriptionUrl) {
          lines.push(`Ссылка подписки: ${result.subscriptionUrl}`);
          lines.push('Шифрование HAPP недоступно: проверьте формат ответа Remnawave API.');
        } else {
          lines.push('Remnawave API не вернул ссылку подписки. Обновите mapping в remnawave.service.ts.');
        }

        await ctx.reply(
          lines.join('\n'),
        );
      } catch (error) {
        await this.replyError(ctx, error);
      }
    }
  }

  private commandArgs(ctx: BotContext): string[] {
    const text = (ctx.message as { text?: string })?.text?.trim() ?? '';
    const parts = text.split(/\s+/);
    return parts.slice(1);
  }

  private async setDealerActive(ctx: BotContext, active: boolean) {
    try {
      const args = this.commandArgs(ctx);
      if (args.length < 1 || !/^\d+$/.test(args[0])) {
        await ctx.reply(`Формат: /${active ? 'dealer_on' : 'dealer_off'} <tg_id>`);
        return;
      }

      await this.dealersService.setActive(
        BigInt(args[0]),
        active,
        this.getTelegramId(ctx),
      );
      await ctx.reply(active ? 'Дилер активирован.' : 'Дилер деактивирован.');
    } catch (error) {
      await this.replyError(ctx, error);
    }
  }

  private getTelegramId(ctx: BotContext): bigint {
    return BigInt(ctx.from?.id ?? 0);
  }

  private async replyError(ctx: BotContext, error: unknown) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
    await ctx.reply(`Ошибка: ${message}`);
  }
}
