import { BotContext } from '../interfaces/bot-context.interface';

export function getTelegramId(ctx: BotContext): bigint {
  return BigInt(ctx.from?.id ?? 0);
}

export function getMessageText(ctx: BotContext): string {
  const message = (ctx as BotContext & {
    message?: { text?: string };
  }).message;

  return message?.text?.trim() ?? '';
}

export function isCallbackContext(ctx: BotContext): boolean {
  return Boolean((ctx as BotContext & { callbackQuery?: unknown }).callbackQuery);
}

export async function answerCallback(ctx: BotContext, text?: string) {
  if (!isCallbackContext(ctx)) {
    return;
  }

  const result = (ctx as BotContext & {
    answerCbQuery?: (text?: string) => Promise<unknown>;
  }).answerCbQuery?.(text);

  await result?.catch(() => undefined);
}

export async function renderMessage(
  ctx: BotContext,
  text: string,
  extra?: Record<string, unknown>,
) {
  await answerCallback(ctx);

  if (isCallbackContext(ctx)) {
    try {
      await (ctx as BotContext & {
        editMessageText: (
          text: string,
          extra?: Record<string, unknown>,
        ) => Promise<unknown>;
      }).editMessageText(text, extra);
      return;
    } catch {
      // Ignore edit failures and fall back to a new message.
    }
  }

  await ctx.reply(text, extra as any);
}
