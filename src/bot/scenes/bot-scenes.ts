export const BOT_FLOW = {
  DEALER_CREATE_SUBSCRIPTION: 'dealer_create_subscription',
  DEALER_SEARCH_SUBSCRIPTION: 'dealer_search_subscription',
  DEALER_CHANGE_SUBSCRIPTION_EXPIRATION: 'dealer_change_subscription_expiration',
  ADMIN_ADD_DEALER: 'admin_add_dealer',
  ADMIN_DELETE_DEALER: 'admin_delete_dealer',
  ADMIN_DEALER_INFO: 'admin_dealer_info',
  ADMIN_CHANGE_TAG: 'admin_change_tag',
  ADMIN_CHANGE_LIMIT: 'admin_change_limit',
  ADMIN_CHANGE_EXPIRATION: 'admin_change_expiration',
} as const;

export type BotFlowType = (typeof BOT_FLOW)[keyof typeof BOT_FLOW];

export interface DealerCreateSubscriptionFlow {
  type: typeof BOT_FLOW.DEALER_CREATE_SUBSCRIPTION;
  step: 'username' | 'days' | 'confirm';
  data: {
    username?: string;
    days?: number;
  };
}

export interface DealerSearchSubscriptionFlow {
  type: typeof BOT_FLOW.DEALER_SEARCH_SUBSCRIPTION;
  step: 'username';
  data: {
    username?: string;
  };
}

export interface DealerChangeSubscriptionExpirationFlow {
  type: typeof BOT_FLOW.DEALER_CHANGE_SUBSCRIPTION_EXPIRATION;
  step: 'expiresAt' | 'confirm';
  data: {
    subscriptionId?: string;
    expiresAtIso?: string;
  };
}

export interface AdminAddDealerFlow {
  type: typeof BOT_FLOW.ADMIN_ADD_DEALER;
  step: 'telegramId' | 'username' | 'tag' | 'accessDays' | 'keyLimit' | 'confirm';
  data: {
    telegramId?: string;
    username?: string;
    tag?: 'STANDARD' | 'PREMIUM';
    accessDays?: number;
    keyLimit?: number;
  };
}

export interface AdminDeleteDealerFlow {
  type: typeof BOT_FLOW.ADMIN_DELETE_DEALER;
  step: 'telegramId' | 'confirm';
  data: {
    telegramId?: string;
  };
}

export interface AdminDealerInfoFlow {
  type: typeof BOT_FLOW.ADMIN_DEALER_INFO;
  step: 'telegramId';
  data: {
    telegramId?: string;
  };
}

export interface AdminChangeTagFlow {
  type: typeof BOT_FLOW.ADMIN_CHANGE_TAG;
  step: 'telegramId' | 'tag' | 'confirm';
  data: {
    telegramId?: string;
    tag?: 'STANDARD' | 'PREMIUM';
  };
}

export interface AdminChangeLimitFlow {
  type: typeof BOT_FLOW.ADMIN_CHANGE_LIMIT;
  step: 'telegramId' | 'keyLimit' | 'confirm';
  data: {
    telegramId?: string;
    keyLimit?: number;
  };
}

export interface AdminChangeExpirationFlow {
  type: typeof BOT_FLOW.ADMIN_CHANGE_EXPIRATION;
  step: 'telegramId' | 'expiresAt' | 'confirm';
  data: {
    telegramId?: string;
    expiresAtIso?: string;
  };
}

export type BotFlow =
  | DealerCreateSubscriptionFlow
  | DealerSearchSubscriptionFlow
  | DealerChangeSubscriptionExpirationFlow
  | AdminAddDealerFlow
  | AdminDeleteDealerFlow
  | AdminDealerInfoFlow
  | AdminChangeTagFlow
  | AdminChangeLimitFlow
  | AdminChangeExpirationFlow;

export type PendingActionType =
  | 'subscription_pause'
  | 'subscription_resume'
  | 'subscription_delete'
  | 'dealer_delete';

export interface PendingAction {
  type: PendingActionType;
  subscriptionId?: string;
  dealerTelegramId?: string;
  page?: number;
  mode?: 'all' | 'search';
}

export interface SubscriptionsViewState {
  mode: 'all' | 'search';
  page: number;
  query?: string;
}

export interface DealersViewState {
  page: number;
}
