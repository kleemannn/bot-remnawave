import {
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import dayjs from 'dayjs';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { AppLoggerService } from '../common/logger/app-logger.service';
import { WebappCreateSubscriptionDto } from './dto/webapp-create-subscription.dto';

@Injectable()
export class WebappService {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly logger: AppLoggerService,
  ) {}

  async getDashboard(telegramId: bigint) {
    const [dealer, activeSubscriptions] = await Promise.all([
      this.getDealerOrThrow(telegramId),
      this.prisma.subscription.count({
        where: {
          dealer: { is: { telegramId } },
          status: SubscriptionStatus.ACTIVE,
          expiresAt: { gt: new Date() },
        },
      }),
    ]);

    return {
      profile: this.mapDealerProfile(dealer, activeSubscriptions),
      stats: {
        activeSubscriptions,
        remainingLimit: Math.max(dealer.keyLimit - dealer.createdCount, 0),
        expiresInDays: dayjs(dealer.expiresAt).diff(dayjs(), 'day'),
      },
    };
  }

  async getProfile(telegramId: bigint) {
    const dealer = await this.getDealerOrThrow(telegramId);
    const activeSubscriptions = await this.prisma.subscription.count({
      where: {
        dealerId: dealer.id,
        status: SubscriptionStatus.ACTIVE,
        expiresAt: { gt: new Date() },
      },
    });

    return this.mapDealerProfile(dealer, activeSubscriptions);
  }

  async listSubscriptions(telegramId: bigint, page = 1, pageSize = 6) {
    const result = await this.subscriptionsService.listByDealerPaginated(
      telegramId,
      page,
      pageSize,
    );

    return {
      items: result.items.map((item) => ({
        id: item.id,
        username: item.dealerUser.username,
        status: item.status,
        expiresAt: item.expiresAt.toISOString(),
        createdAt: item.createdAt.toISOString(),
      })),
      page: result.page,
      pageCount: result.pageCount,
      total: result.total,
    };
  }

  async getSubscription(telegramId: bigint, subscriptionId: string) {
    const subscription = await this.subscriptionsService.getSubscriptionForDealer(
      telegramId,
      subscriptionId,
    );

    return {
      id: subscription.id,
      username: subscription.dealerUser.username,
      status: subscription.status,
      expiresAt: subscription.expiresAt.toISOString(),
      createdAt: subscription.createdAt.toISOString(),
      dealerTag: subscription.dealer.tag,
      createdBy:
        subscription.dealer.username?.startsWith('@')
          ? subscription.dealer.username
          : subscription.dealer.username
            ? `@${subscription.dealer.username}`
            : subscription.dealer.telegramId.toString(),
      daysLeft: Math.max(dayjs(subscription.expiresAt).diff(dayjs(), 'day'), 0),
    };
  }

  async createSubscription(
    telegramId: bigint,
    dto: WebappCreateSubscriptionDto,
  ) {
    const created = await this.subscriptionsService.createForDealer(telegramId, dto);
    const detail = await this.getSubscription(telegramId, created.subscription.id);

    return {
      subscription: detail,
      subscriptionUrl: created.subscriptionUrl ?? null,
      happEncryptedUrl: created.happEncryptedUrl ?? null,
    };
  }

  async pauseSubscription(telegramId: bigint, subscriptionId: string) {
    await this.subscriptionsService.pauseSubscription(telegramId, subscriptionId);
    this.logger.logEvent(
      'webapp_subscription_paused',
      {
        telegramId: telegramId.toString(),
        subscriptionId,
      },
      WebappService.name,
    );
  }

  async resumeSubscription(telegramId: bigint, subscriptionId: string) {
    await this.subscriptionsService.resumeSubscription(telegramId, subscriptionId);
    this.logger.logEvent(
      'webapp_subscription_resumed',
      {
        telegramId: telegramId.toString(),
        subscriptionId,
      },
      WebappService.name,
    );
  }

  async deleteSubscription(telegramId: bigint, subscriptionId: string) {
    await this.subscriptionsService.deleteSubscription(telegramId, subscriptionId);
    this.logger.logEvent(
      'webapp_subscription_deleted',
      {
        telegramId: telegramId.toString(),
        subscriptionId,
      },
      WebappService.name,
    );
  }

  private async getDealerOrThrow(telegramId: bigint) {
    const dealer = await this.authService.getDealerByTelegramId(telegramId);
    if (!dealer) {
      throw new ForbiddenException('Вы не зарегистрированы как дилер.');
    }

    return dealer;
  }

  private mapDealerProfile(
    dealer: Awaited<ReturnType<WebappService['getDealerOrThrow']>>,
    activeSubscriptions: number,
  ) {
    return {
      telegramId: dealer.telegramId.toString(),
      username: dealer.username,
      tag: dealer.tag,
      isActive: dealer.isActive,
      expiresAt: dealer.expiresAt.toISOString(),
      keyLimit: dealer.keyLimit,
      createdCount: dealer.createdCount,
      remainingCount: Math.max(dealer.keyLimit - dealer.createdCount, 0),
      activeSubscriptions,
      daysUntilExpiry: dayjs(dealer.expiresAt).diff(dayjs(), 'day'),
    };
  }
}
