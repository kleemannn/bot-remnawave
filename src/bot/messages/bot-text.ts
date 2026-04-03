import { Dealer, SubscriptionStatus } from '@prisma/client';
import {
  formatDate,
  formatDaysFromSeconds,
  formatDaysLeft,
  formatDealerStatus,
  formatDealerTag,
  formatRemainingKeys,
  formatSubscriptionStatus,
  formatUsername,
} from '../utils/format.util';

interface SubscriptionCardData {
  id: string;
  status: SubscriptionStatus;
  expiresAt: Date;
  remainingSeconds?: number | null;
  dealerUser: {
    username: string;
  };
  dealer: {
    telegramId: bigint;
    username: string | null;
  };
}

export const BotText = {
  welcome(isAdmin: boolean, isDealer: boolean) {
    if (isAdmin && isDealer) {
      return 'Добро пожаловать. Я помогу управлять подписками и дилерами шаг за шагом.';
    }

    if (isAdmin) {
      return 'Добро пожаловать. Я помогу управлять дилерами и быстро находить нужную информацию.';
    }

    return 'Здравствуйте. Я помогу создать подписку, найти ее и управлять вашими ключами без сложных команд.';
  },

  mainMenuTitle(isAdmin: boolean) {
    return isAdmin ? 'Главное меню' : 'Выберите действие';
  },

  adminMenuTitle() {
    return 'Админ-меню';
  },

  help() {
    return [
      'Я работаю как пошаговый помощник.',
      'Выберите действие кнопкой ниже, а я спрошу только нужные данные.',
      'Во время любого сценария можно нажать «Отмена».',
    ].join('\n');
  },

  askSubscriptionUsername() {
    return 'Введите имя пользователя для новой подписки.';
  },

  askSubscriptionDays() {
    return 'Введите количество дней для подписки.';
  },

  confirmCreateSubscription(username: string, days: number) {
    return [
      'Проверьте данные перед созданием:',
      `Имя пользователя: ${username}`,
      `Срок: ${days} дн.`,
    ].join('\n');
  },

  subscriptionCreated(result: {
    id: string;
    expiresAt: Date;
    happEncryptedUrl?: string;
    subscriptionUrl?: string;
  }) {
    const lines = [
      'Подписка создана.',
      `ID: ${result.id}`,
      `Дата окончания: ${formatDate(result.expiresAt)}`,
    ];

    if (result.happEncryptedUrl) {
      lines.push(`HAPP ссылка: ${result.happEncryptedUrl}`);
    } else if (result.subscriptionUrl) {
      lines.push(`Ссылка подписки: ${result.subscriptionUrl}`);
    }

    return lines.join('\n');
  },

  emptySubscriptions() {
    return 'Подписок пока нет.';
  },

  subscriptionsList(page: number, pageCount: number, query?: string) {
    const lines = [
      query ? `Результаты поиска по имени: ${query}` : 'Ваши подписки',
      `Страница ${page} из ${pageCount}`,
      'Выберите подписку:',
    ];

    return lines.join('\n');
  },

  subscriptionCard(subscription: SubscriptionCardData) {
    const daysLeft =
      subscription.status === SubscriptionStatus.PAUSED
        ? formatDaysFromSeconds(subscription.remainingSeconds)
        : formatDaysLeft(subscription.expiresAt);

    return [
      'Карточка подписки',
      `Имя: ${subscription.dealerUser.username}`,
      `Статус: ${formatSubscriptionStatus(subscription.status)}`,
      `Дата окончания: ${formatDate(subscription.expiresAt)}`,
      `Дней осталось: ${daysLeft}`,
      `Кто создал: ${formatUsername(subscription.dealer.username)} (${subscription.dealer.telegramId.toString()})`,
    ].join('\n');
  },

  askSearchUsername() {
    return 'Введите username для поиска среди ваших подписок.';
  },

  noSearchResults(username: string) {
    return `По запросу «${username}» ничего не найдено. Попробуйте другое имя.`;
  },

  dealerProfile(dealer: Dealer) {
    return [
      'Профиль дилера',
      `Тег дилера: ${formatDealerTag(dealer.tag)}`,
      `Доступ до: ${formatDate(dealer.expiresAt)}`,
      `Лимит ключей: ${dealer.keyLimit}`,
      `Создано ключей: ${dealer.createdCount}`,
      `Осталось ключей: ${formatRemainingKeys(dealer)}`,
      `Статус дилера: ${formatDealerStatus(dealer)}`,
    ].join('\n');
  },

  askDealerTelegramId(action: string) {
    return `Введите Telegram ID дилера, чтобы ${action}.`;
  },

  askDealerUsername() {
    return 'Введите username дилера без @.';
  },

  askDealerAccessDays() {
    return 'Введите срок доступа в днях.';
  },

  askDealerLimit() {
    return 'Введите лимит ключей.';
  },

  askDealerExpiration() {
    return 'Введите новую дату окончания. Формат: ДД.ММ.ГГГГ ЧЧ:ММ';
  },

  confirmAddDealer(data: {
    telegramId: string;
    username: string;
    tag: string;
    accessDays: number;
    keyLimit: number;
  }) {
    return [
      'Проверьте данные дилера:',
      `Telegram ID: ${data.telegramId}`,
      `Username: ${data.username}`,
      `Тег: ${data.tag.toLowerCase()}`,
      `Доступ: ${data.accessDays} дн.`,
      `Лимит ключей: ${data.keyLimit}`,
    ].join('\n');
  },

  dealerCard(dealer: Dealer) {
    return [
      'Карточка дилера',
      `Telegram ID: ${dealer.telegramId.toString()}`,
      `Username: ${formatUsername(dealer.username)}`,
      `Тег: ${formatDealerTag(dealer.tag)}`,
      `Статус: ${formatDealerStatus(dealer)}`,
      `Доступ до: ${formatDate(dealer.expiresAt)}`,
      `Лимит ключей: ${dealer.keyLimit}`,
      `Создано ключей: ${dealer.createdCount}`,
      `Осталось ключей: ${formatRemainingKeys(dealer)}`,
    ].join('\n');
  },

  stats(stats: {
    total: number;
    active: number;
    expired: number;
    premium: number;
    standard: number;
  }) {
    return [
      'Статистика дилеров',
      `Всего: ${stats.total}`,
      `Активных: ${stats.active}`,
      `Истекших: ${stats.expired}`,
      `Premium: ${stats.premium}`,
      `Standard: ${stats.standard}`,
    ].join('\n');
  },

  confirmDangerousAction(title: string, description: string) {
    return [title, description, '', 'Подтвердите действие.'].join('\n');
  },

  success(text: string) {
    return text;
  },

  canceled() {
    return 'Действие отменено.';
  },

  askTagSelection() {
    return 'Выберите новый тег дилера.';
  },

  confirmTagChange(telegramId: string, tag: string) {
    return [
      'Подтвердите изменение тега:',
      `Telegram ID: ${telegramId}`,
      `Новый тег: ${tag.toLowerCase()}`,
    ].join('\n');
  },

  confirmLimitChange(telegramId: string, limit: number) {
    return [
      'Подтвердите изменение лимита:',
      `Telegram ID: ${telegramId}`,
      `Новый лимит: ${limit}`,
    ].join('\n');
  },

  confirmExpirationChange(telegramId: string, formattedDate: string) {
    return [
      'Подтвердите изменение срока доступа:',
      `Telegram ID: ${telegramId}`,
      `Новая дата: ${formattedDate}`,
    ].join('\n');
  },

  notDealer() {
    return 'У вас нет дилерского профиля.';
  },

  notAdmin() {
    return 'Этот раздел доступен только администратору.';
  },

  chooseMenuAction() {
    return 'Выберите действие кнопкой ниже.';
  },

  genericError(message: string) {
    return `Ошибка: ${message}`;
  },
};
