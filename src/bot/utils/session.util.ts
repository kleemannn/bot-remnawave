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

export function clearFlowMessageId(ctx: BotContext) {
  ensureSession(ctx).flowMessageId = undefined;
}

export function setFlowMessageId(ctx: BotContext, messageId: number) {
  ensureSession(ctx).flowMessageId = messageId;
}

export function setCreatedSubscriptionLink(
  ctx: BotContext,
  subscriptionId: string,
  link: string,
) {
  const session = ensureSession(ctx);
  session.createdSubscriptionLinks ??= {};
  session.createdSubscriptionLinks[subscriptionId] = link;
}

export function getCreatedSubscriptionLink(
  ctx: BotContext,
  subscriptionId: string,
): string | undefined {
  return ensureSession(ctx).createdSubscriptionLinks?.[subscriptionId];
}

export function setSentSubscriptionLinkMessageId(ctx: BotContext, messageId: number) {
  ensureSession(ctx).sentSubscriptionLinkMessageId = messageId;
}

export function getSentSubscriptionLinkMessageId(ctx: BotContext): number | undefined {
  return ensureSession(ctx).sentSubscriptionLinkMessageId;
}

export function clearSentSubscriptionLinkMessageId(ctx: BotContext) {
  ensureSession(ctx).sentSubscriptionLinkMessageId = undefined;
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
