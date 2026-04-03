import { Dealer, DealerTag, SubscriptionStatus } from '@prisma/client';
import { buildRemnawaveOwnerTag } from '../../common/utils/remnawave-owner-tag.util';
import { cardLine, cardNote, renderCard } from '../formatters/card.formatter';
import {
  formatDealerStatusLabel,
  formatDealerTagLabel,
  formatSubscriptionStatusLabel,
  getDealerWarning,
  getSubscriptionWarning,
} from '../formatters/status.formatter';
import {
  formatDate,
  formatDaysFromSeconds,
  formatDaysLeft,
  formatRemainingKeys,
  formatUsername,
} from '../utils/format.util';

interface SubscriptionCardData {
  id: string;
  status: SubscriptionStatus;
  createdAt: Date;
  expiresAt: Date;
  remainingSeconds?: number | null;
  dealerUser: {
    username: string;
  };
  dealer: {
    telegramId: bigint;
    username: string | null;
    tag: DealerTag;
  };
}

export const BotText = {
  welcome(isAdmin: boolean, isDealer: boolean) {
    const lines = ['Добро пожаловать в панель управления Remnawave.'];

    if (isDealer) {
      lines.push('Здесь можно создавать ключи, искать подписки и быстро управлять ими.');
    }

    if (isAdmin) {
      lines.push('Админ-раздел поможет управлять дилерами и следить за статистикой.');
    }

    return renderCard('🏠 Главное меню', lines);
  },

  mainMenuTitle(isAdmin: boolean) {
    return isAdmin ? '🏠 Главное меню' : '🏠 Панель дилера';
  },

  adminMenuTitle() {
    return renderCard('⚙️ Админ-панель', [
      'Быстрый доступ к дилерам, статистике и управлению.',
      'Выберите нужный раздел ниже.',
    ]);
  },

  adminManagementTitle() {
    return renderCard('⚙️ Управление дилерами', [
      'Здесь собраны точечные действия по дилерам.',
      'Выберите, что хотите изменить.',
    ]);
  },

  dealerHelp() {
    return renderCard('❓ Помощь дилеру', [
      '📦 Создавайте подписки пошагово без длинных команд.',
      '📋 Открывайте карточку подписки и управляйте ей кнопками.',
      '🔍 Поиск показывает только ваши подписки.',
      '✅ Активна, ⏸ На паузе, ⏳ Истекла, ❌ Удалена.',
      '🔑 Остаток ключей = лимит минус количество созданных.',
    ]);
  },

  adminHelp() {
    return renderCard('❓ Помощь администратору', [
      '👨‍💼 Раздел «Дилеры» открывает список и карточки дилеров.',
      '➕ «Добавить дилера» создает нового дилера пошагово.',
      '⚙️ «Управление» меняет тег, лимит и срок доступа.',
      '📊 «Статистика» показывает текущую сводку по дилерам.',
      '🏷 Standard и Premium используют разные дилерские тарифы.',
    ]);
  },

  combinedHelp() {
    return [
      renderCard('❓ Помощь дилеру', [
        '📦 Создавайте подписки пошагово без длинных команд.',
        '📋 Открывайте карточку подписки и управляйте ей кнопками.',
        '🔍 Поиск показывает только ваши подписки.',
        '✅ Активна, ⏸ На паузе, ⏳ Истекла, ❌ Удалена.',
        '🔑 Остаток ключей = лимит минус количество созданных.',
      ]),
      renderCard('❓ Помощь администратору', [
        '👨‍💼 Раздел «Дилеры» открывает список и карточки дилеров.',
        '➕ «Добавить дилера» создает нового дилера пошагово.',
        '⚙️ «Управление» меняет тег, лимит и срок доступа.',
        '📊 «Статистика» показывает текущую сводку по дилерам.',
        '🏷 Standard и Premium используют разные дилерские тарифы.',
      ]),
    ].join('\n\n');
  },

  askSubscriptionUsername() {
    return renderCard('📦 Создание подписки', [
      'Шаг 1 из 2',
      'Введите имя пользователя без пробелов.',
      'Префикс дилера добавится автоматически.',
    ]);
  },

  askSubscriptionDays() {
    return renderCard('📦 Создание подписки', [
      'Шаг 2 из 2',
      'Введите срок подписки в днях.',
      'Или выберите быстрый вариант кнопкой ниже.',
    ]);
  },

  confirmCreateSubscription(username: string, days: number) {
    return renderCard('📦 Подтвердите создание', [
      cardLine('👤', 'Пользователь', username),
      cardLine('📅', 'Срок', `${days} дн.`),
      'Если все верно, нажмите «Создать».',
    ]);
  },

  subscriptionCreated(result: {
    id: string;
    username: string;
    days: number;
    dealerTag: DealerTag;
    dealerUsername: string | null;
    dealerTelegramId: bigint;
    expiresAt: Date;
    happEncryptedUrl?: string;
    subscriptionUrl?: string;
  }) {
    return renderCard(
      '✅ Подписка создана',
      [
        cardLine('👤', 'Пользователь', result.username),
        cardLine('📅', 'Срок', `${result.days} дн.`),
        cardLine('🏷', 'Тариф дилера', formatDealerTagLabel(result.dealerTag)),
        cardLine(
          '🏷',
          'Тег владельца',
          buildRemnawaveOwnerTag(result.dealerUsername, result.dealerTelegramId),
        ),
        cardLine('📅', 'Действует до', formatDate(result.expiresAt)),
        'Нажмите кнопку ниже, чтобы показать ключ отдельно.',
      ],
    );
  },

  emptySubscriptions() {
    return renderCard('📋 Подписок пока нет', [
      'У вас еще нет активных подписок.',
      'Создайте первую подписку кнопкой ниже.',
    ]);
  },

  subscriptionsList(page: number, pageCount: number, query?: string) {
    return renderCard(query ? '🔍 Результаты поиска' : '📋 Мои подписки', [
      query ? cardLine('👤', 'Поиск', query) : 'Выберите подписку из списка ниже.',
      cardLine('📄', 'Страница', `${page} из ${pageCount}`),
    ]);
  },

  subscriptionCard(subscription: SubscriptionCardData) {
    const daysLeft =
      subscription.status === SubscriptionStatus.PAUSED
        ? formatDaysFromSeconds(subscription.remainingSeconds)
        : formatDaysLeft(subscription.expiresAt);
    const warning = getSubscriptionWarning(subscription);

    return renderCard(
      '📦 Карточка подписки',
      [
        cardLine('👤', 'Пользователь', subscription.dealerUser.username),
        cardLine('📌', 'Статус', formatSubscriptionStatusLabel(subscription)),
        cardLine('🗓', 'Создана', formatDate(subscription.createdAt)),
        cardLine('📅', 'Действует до', formatDate(subscription.expiresAt)),
        cardLine('⏳', 'Осталось дней', daysLeft),
        cardLine('🏷', 'Тег дилера', formatDealerTagLabel(subscription.dealer.tag)),
        cardLine(
          '🏷',
          'Тег владельца',
          buildRemnawaveOwnerTag(
            subscription.dealer.username,
            subscription.dealer.telegramId,
          ),
        ),
        cardLine(
          '👨‍💼',
          'Создал',
          `${formatUsername(subscription.dealer.username)} (${subscription.dealer.telegramId.toString()})`,
        ),
      ],
      warning ? [cardNote(warning), '🛠 Действия доступны кнопками ниже.'] : ['🛠 Действия доступны кнопками ниже.'],
    );
  },

  askSearchUsername() {
    return renderCard('🔍 Поиск подписки', [
      'Введите username, чтобы найти ваши подписки.',
    ]);
  },

  noSearchResults(username: string) {
    return renderCard('🔍 Ничего не найдено', [
      cardLine('👤', 'Запрос', username),
      'Попробуйте другое имя пользователя.',
    ]);
  },

  dealerProfile(dealer: Dealer) {
    const warning = getDealerWarning(dealer);

    return renderCard(
      '👤 Профиль дилера',
      [
        cardLine('🏷', 'Тег', formatDealerTagLabel(dealer.tag)),
        cardLine('📌', 'Статус', formatDealerStatusLabel(dealer)),
        cardLine('📅', 'Доступ до', formatDate(dealer.expiresAt)),
        cardLine('🔑', 'Лимит ключей', String(dealer.keyLimit)),
        cardLine('📦', 'Создано', String(dealer.createdCount)),
        cardLine('✅', 'Осталось', formatRemainingKeys(dealer)),
      ],
      warning ? [cardNote(warning)] : undefined,
    );
  },

  dealerBlocked(dealer: Dealer, reason: string) {
    return renderCard('⚠️ Создание сейчас недоступно', [
      cardLine('📌', 'Статус', formatDealerStatusLabel(dealer)),
      cardLine('📅', 'Доступ до', formatDate(dealer.expiresAt)),
      cardLine('🔑', 'Осталось ключей', formatRemainingKeys(dealer)),
      '',
      reason,
    ]);
  },

  askDealerTelegramId(action: string) {
    return renderCard('👨‍💼 Данные дилера', [
      `Введите Telegram ID, чтобы ${action}.`,
    ]);
  },

  askDealerUsername() {
    return renderCard('➕ Добавление дилера', ['Введите username дилера без @.']);
  },

  askDealerAccessDays() {
    return renderCard('➕ Добавление дилера', ['Введите срок доступа в днях.']);
  },

  askDealerLimit() {
    return renderCard('⚙️ Изменение лимита', ['Введите лимит ключей.']);
  },

  askDealerExpiration() {
    return renderCard('📅 Изменение срока доступа', [
      'Введите новую дату окончания.',
      'Формат: ДД.ММ.ГГГГ ЧЧ:ММ',
    ]);
  },

  confirmAddDealer(data: {
    telegramId: string;
    username: string;
    tag: string;
    accessDays: number;
    keyLimit: number;
  }) {
    return renderCard('➕ Подтвердите дилера', [
      cardLine('🆔', 'Telegram ID', data.telegramId),
      cardLine('👤', 'Username', data.username),
      cardLine('🏷', 'Тег', data.tag.toLowerCase()),
      cardLine('📅', 'Доступ', `${data.accessDays} дн.`),
      cardLine('🔑', 'Лимит', String(data.keyLimit)),
    ]);
  },

  dealerCard(dealer: Dealer) {
    const warning = getDealerWarning(dealer);

    return renderCard(
      '👨‍💼 Карточка дилера',
      [
        cardLine('🆔', 'Telegram ID', dealer.telegramId.toString()),
        cardLine('👤', 'Username', formatUsername(dealer.username)),
        cardLine('🏷', 'Тег', formatDealerTagLabel(dealer.tag)),
        cardLine('📌', 'Статус', formatDealerStatusLabel(dealer)),
        cardLine('📅', 'Доступ до', formatDate(dealer.expiresAt)),
        cardLine('🔑', 'Лимит', String(dealer.keyLimit)),
        cardLine('📦', 'Создано', String(dealer.createdCount)),
        cardLine('✅', 'Осталось', formatRemainingKeys(dealer)),
      ],
      warning ? [cardNote(warning), '🛠 Действия доступны кнопками ниже.'] : ['🛠 Действия доступны кнопками ниже.'],
    );
  },

  emptyDealers() {
    return renderCard('👨‍💼 Дилеров пока нет', [
      'Добавьте первого дилера, чтобы начать работу.',
    ]);
  },

  dealersList(page: number, pageCount: number) {
    return renderCard('👨‍💼 Список дилеров', [
      cardLine('📄', 'Страница', `${page} из ${pageCount}`),
      'Выберите дилера для просмотра карточки.',
    ]);
  },

  stats(stats: {
    total: number;
    active: number;
    expired: number;
    premium: number;
    standard: number;
  }) {
    return renderCard('📊 Статистика дилеров', [
      cardLine('👨‍💼', 'Всего', String(stats.total)),
      cardLine('✅', 'Активных', String(stats.active)),
      cardLine('⏳', 'Истекших', String(stats.expired)),
      cardLine('🏷', 'Premium', String(stats.premium)),
      cardLine('🏷', 'Standard', String(stats.standard)),
    ]);
  },

  confirmSubscriptionAction(
    title: string,
    subscription: SubscriptionCardData,
    dangerText: string,
  ) {
    return renderCard(`⚠️ ${title}`, [
      cardLine('👤', 'Пользователь', subscription.dealerUser.username),
      cardLine('📅', 'Действует до', formatDate(subscription.expiresAt)),
      cardLine('📌', 'Статус', formatSubscriptionStatusLabel(subscription)),
      '',
      dangerText,
    ]);
  },

  confirmDealerDeletion(dealer: Dealer) {
    return renderCard('⚠️ Подтвердите удаление дилера', [
      cardLine('🆔', 'Telegram ID', dealer.telegramId.toString()),
      cardLine('👤', 'Username', formatUsername(dealer.username)),
      cardLine('📌', 'Статус', formatDealerStatusLabel(dealer)),
      '',
      'После удаления действие нельзя отменить.',
    ]);
  },

  success(text: string) {
    return `✅ ${text}`;
  },

  canceled() {
    return '❌ Действие отменено.';
  },

  askTagSelection() {
    return renderCard('🏷 Выбор тега', ['Выберите новый тег дилера.']);
  },

  confirmTagChange(telegramId: string, tag: string) {
    return renderCard('🏷 Подтвердите изменение тега', [
      cardLine('🆔', 'Telegram ID', telegramId),
      cardLine('🏷', 'Новый тег', tag.toLowerCase()),
    ]);
  },

  confirmLimitChange(telegramId: string, limit: number) {
    return renderCard('🔑 Подтвердите изменение лимита', [
      cardLine('🆔', 'Telegram ID', telegramId),
      cardLine('🔑', 'Новый лимит', String(limit)),
    ]);
  },

  confirmExpirationChange(telegramId: string, formattedDate: string) {
    return renderCard('📅 Подтвердите изменение срока', [
      cardLine('🆔', 'Telegram ID', telegramId),
      cardLine('📅', 'Новая дата', formattedDate),
    ]);
  },

  notDealer() {
    return renderCard('⚠️ Доступ ограничен', [
      'У вас нет дилерского профиля.',
    ]);
  },

  notAdmin() {
    return renderCard('⚠️ Доступ ограничен', [
      'Этот раздел доступен только администратору.',
    ]);
  },

  chooseMenuAction() {
    return 'Выберите действие кнопкой ниже.';
  },

  genericError(message: string) {
    return renderCard('⚠️ Ошибка', [message]);
  },
};
