import { Context } from 'telegraf';
import {
  BotFlow,
  DealersViewState,
  PendingAction,
  SubscriptionsViewState,
} from '../scenes/bot-scenes';

export interface BotSession {
  flow?: BotFlow;
  flowMessageId?: number;
  pendingAction?: PendingAction;
  subscriptionsView?: SubscriptionsViewState;
  dealersView?: DealersViewState;
}

export interface BotContext extends Context {
  session: BotSession;
}
