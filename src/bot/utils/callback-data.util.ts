export const callbackData = {
  mainMenu: 'menu:main',
  help: 'menu:help',
  adminMenu: 'menu:admin',
  adminManagementMenu: 'menu:admin:management',
  dealerProfile: 'dealer:profile',
  dealerCreateStart: 'dealer:create:start',
  dealerCreateConfirm: 'dealer:create:confirm',
  dealerCreateDays: (days: number) => `dealer:create:days:${days}`,
  dealerCreatedLink: (subscriptionId: string) => `dealer:create:link:${subscriptionId}`,
  dealerSearchStart: 'dealer:search:start',
  subscriptionsList: (page = 1) => `subs:list:${page}`,
  subscriptionsSearchResults: (page = 1) => `subs:search:list:${page}`,
  subscriptionCard: (subscriptionId: string) => `subs:card:${subscriptionId}`,
  subscriptionLink: (subscriptionId: string) => `subs:link:${subscriptionId}`,
  subscriptionPauseAsk: (subscriptionId: string) => `subs:pause:ask:${subscriptionId}`,
  subscriptionPauseConfirm: (subscriptionId: string) =>
    `subs:pause:confirm:${subscriptionId}`,
  subscriptionRecreateAsk: (subscriptionId: string) =>
    `subs:recreate:ask:${subscriptionId}`,
  subscriptionRecreateConfirm: (subscriptionId: string) =>
    `subs:recreate:confirm:${subscriptionId}`,
  subscriptionResumeAsk: (subscriptionId: string) =>
    `subs:resume:ask:${subscriptionId}`,
  subscriptionResumeConfirm: (subscriptionId: string) =>
    `subs:resume:confirm:${subscriptionId}`,
  subscriptionChangeExpirationAsk: (subscriptionId: string) =>
    `subs:expiration:ask:${subscriptionId}`,
  subscriptionChangeExpirationDays: (subscriptionId: string, days: number) =>
    `subs:expiration:days:${subscriptionId}:${days}`,
  subscriptionChangeExpirationConfirm: (subscriptionId: string) =>
    `subs:expiration:confirm:${subscriptionId}`,
  subscriptionDeleteAsk: (subscriptionId: string) =>
    `subs:delete:ask:${subscriptionId}`,
  subscriptionDeleteConfirm: (subscriptionId: string) =>
    `subs:delete:confirm:${subscriptionId}`,
  adminAddDealerStart: 'admin:add:start',
  adminDeleteDealerStart: 'admin:delete:start',
  adminDeleteDealersList: (page = 1) => `admin:delete:list:${page}`,
  adminDealersList: (page = 1) => `admin:dealers:${page}`,
  adminDealerCard: (telegramId: string) => `admin:dealer:${telegramId}`,
  adminDealerToggleActive: (telegramId: string, active: 'on' | 'off') =>
    `admin:dealer:active:${telegramId}:${active}`,
  adminDealerInfoStart: 'admin:info:start',
  adminChangeTagStart: 'admin:tag:start',
  adminChangeTagForDealer: (telegramId: string) => `admin:tag:start:${telegramId}`,
  adminTagSelect: (tag: 'STANDARD' | 'PREMIUM') => `admin:tag:select:${tag}`,
  adminChangeLimitStart: 'admin:limit:start',
  adminChangeLimitForDealer: (telegramId: string) => `admin:limit:start:${telegramId}`,
  adminChangeExpirationStart: 'admin:expiration:start',
  adminChangeExpirationForDealer: (telegramId: string) =>
    `admin:expiration:start:${telegramId}`,
  adminStats: 'admin:stats',
  adminConfirmAddDealer: 'admin:add:confirm',
  adminConfirmChangeTag: 'admin:tag:confirm',
  adminConfirmChangeLimit: 'admin:limit:confirm',
  adminConfirmChangeExpiration: 'admin:expiration:confirm',
  adminDeleteDealerAsk: (telegramId: string) => `admin:delete:ask:${telegramId}`,
  adminConfirmDeleteDealer: (telegramId: string) =>
    `admin:delete:confirm:${telegramId}`,
  cancelFlow: 'flow:cancel',
} as const;
