import { BotContext } from '../interfaces/bot-context.interface';
import { BotFlow, DealersViewState, SubscriptionsViewState } from '../scenes/bot-scenes';

export function ensureSession(ctx: BotContext) {
  ctx.session ??= {};
  return ctx.session;
}

export function clearFlow(ctx: BotContext) {
  ensureSession(ctx).flow = undefined;
}

export function setFlow(ctx: BotContext, flow: BotFlow) {
  ensureSession(ctx).flow = flow;
}

export function setSubscriptionsView(ctx: BotContext, view: SubscriptionsViewState) {
  ensureSession(ctx).subscriptionsView = view;
}

export function setDealersView(ctx: BotContext, view: DealersViewState) {
  ensureSession(ctx).dealersView = view;
}

export function clearPendingAction(ctx: BotContext) {
  ensureSession(ctx).pendingAction = undefined;
}
