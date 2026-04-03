import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DealerTag, SubscriptionStatus } from '@prisma/client';
import dayjs from 'dayjs';
import { AuditService } from '../common/audit/audit.service';
import { buildRemnawaveOwnerTag } from '../common/utils/remnawave-owner-tag.util';
import { DealersService } from '../dealers/dealers.service';
import { PrismaService } from '../prisma/prisma.service';
import { RemnawaveService } from '../remnawave/remnawave.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { HappCryptoService } from '../happ/happ-crypto.service';
import { CreateSubscriptionResult } from './interfaces/create-subscription-result.interface';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dealersService: DealersService,
    private readonly remnawaveService: RemnawaveService,
    private readonly happCryptoService: HappCryptoService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async createForDealer(
    dealerTelegramId: bigint,
    dto: CreateSubscriptionDto,
  ): Promise<CreateSubscriptionResult> {
    const dealer = await this.dealersService.getDealerByTelegramId(dealerTelegramId);
    if (!dealer) {
      throw new NotFoundException('Дилер не найден');
    }

    const guard = this.dealersService.isDealerBlocked(dealer);
    if (guard.blocked) {
      throw new BadRequestException(guard.reason);
    }

    const squadId =
      dealer.tag === DealerTag.PREMIUM
        ? this.configService.getOrThrow<string>('remnawave.premiumSquadId')
        : this.configService.getOrThrow<string>('remnawave.standardSquadId');

    const expiresAt = dayjs().add(dto.days, 'day').toDate();
    const ownerTag = buildRemnawaveOwnerTag(dealer.username, dealer.telegramId);
    const remote = await this.remnawaveService.createUser({
      username: dto.username,
      squadId,
      tag: ownerTag,
      expiresAt,
    });

    const subscription = await this.prisma.$transaction(async (tx) => {
      const dealerUser = await tx.dealerUser.upsert({
        where: {
          dealerId_username: {
            dealerId: dealer.id,
            username: dto.username,
          },
        },
        update: {
          remnawaveUserId: remote.userId,
        },
        create: {
          dealerId: dealer.id,
          username: dto.username,
          remnawaveUserId: remote.userId,
        },
      });

      const subscription = await tx.subscription.create({
        data: {
          dealerId: dealer.id,
          dealerUserId: dealerUser.id,
          remnawaveUserId: remote.userId,
          days: dto.days,
          expiresAt,
          status: SubscriptionStatus.ACTIVE,
        },
      });

      await tx.dealer.update({
        where: { id: dealer.id },
        data: { createdCount: { increment: 1 } },
      });

      return subscription;
    });

    await this.auditService.record({
      actorId: dealerTelegramId,
      actorRole: 'dealer',
      action: 'SUBSCRIPTION_CREATE',
      entity: 'subscriptions',
      entityId: subscription.id,
      success: true,
      newState: {
        id: subscription.id,
        status: subscription.status,
        expiresAt: subscription.expiresAt,
      },
      metadata: {
        username: dto.username,
        days: dto.days,
        squadId,
        ownerTag,
        remnawaveUserId: remote.userId,
      },
    });

    let happEncryptedUrl: string | undefined;
    if (remote.subscriptionUrl) {
      happEncryptedUrl = await this.happCryptoService.encryptSubscriptionUrl(
        remote.subscriptionUrl,
      );
    }

    return {
      subscription,
      subscriptionUrl: remote.subscriptionUrl,
      happEncryptedUrl,
    };
  }

  async listByDealer(dealerTelegramId: bigint) {
    const dealer = await this.dealersService.getDealerByTelegramId(dealerTelegramId);
    if (!dealer) {
      throw new NotFoundException('Дилер не найден');
    }

    await this.syncSubscriptionsForDealer(dealer.id);

    return this.prisma.subscription.findMany({
      where: { dealerId: dealer.id, status: { not: SubscriptionStatus.DELETED } },
      include: { dealerUser: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listByDealerPaginated(
    dealerTelegramId: bigint,
    page = 1,
    pageSize = 5,
  ) {
    const dealer = await this.getDealerOrThrow(dealerTelegramId);
    await this.syncSubscriptionsForDealer(dealer.id);

    const where = {
      dealerId: dealer.id,
      status: { not: SubscriptionStatus.DELETED },
    };

    const total = await this.prisma.subscription.count({ where });
    const pageCount = Math.max(Math.ceil(total / pageSize), 1);
    const currentPage = Math.min(Math.max(page, 1), pageCount);

    const items = await this.prisma.subscription.findMany({
      where,
      include: { dealerUser: true, dealer: true },
      orderBy: { createdAt: 'desc' },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
    });

    return {
      items,
      total,
      page: currentPage,
      pageCount,
    };
  }

  async searchByDealerUsername(
    dealerTelegramId: bigint,
    query: string,
    page = 1,
    pageSize = 5,
  ) {
    const dealer = await this.getDealerOrThrow(dealerTelegramId);
    await this.syncSubscriptionsForDealer(dealer.id);

    const where = {
      dealerId: dealer.id,
      status: { not: SubscriptionStatus.DELETED },
      dealerUser: {
        username: {
          contains: query,
          mode: 'insensitive' as const,
        },
      },
    };

    const total = await this.prisma.subscription.count({ where });
    const pageCount = Math.max(Math.ceil(total / pageSize), 1);
    const currentPage = Math.min(Math.max(page, 1), pageCount);

    const items = await this.prisma.subscription.findMany({
      where,
      include: { dealerUser: true, dealer: true },
      orderBy: { createdAt: 'desc' },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
    });

    return {
      items,
      total,
      page: currentPage,
      pageCount,
      query,
    };
  }

  async getSubscriptionForDealer(dealerTelegramId: bigint, subscriptionId: string) {
    const subscription = await this.getOwnedSubscriptionOrThrow(
      dealerTelegramId,
      subscriptionId,
    );

    return this.prisma.subscription.findUniqueOrThrow({
      where: { id: subscription.id },
      include: { dealerUser: true, dealer: true },
    });
  }

  async deleteSubscription(dealerTelegramId: bigint, subscriptionId: string): Promise<void> {
    const subscription = await this.getOwnedSubscriptionOrThrow(
      dealerTelegramId,
      subscriptionId,
    );
    const previousState = {
      status: subscription.status,
      expiresAt: subscription.expiresAt,
      remnawaveUserId: subscription.remnawaveUserId,
    };

    await this.remnawaveService.deleteUser(subscription.remnawaveUserId);

    const updated = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.DELETED,
      },
    });

    await this.auditService.record({
      actorId: dealerTelegramId,
      actorRole: 'dealer',
      action: 'SUBSCRIPTION_DELETE',
      entity: 'subscriptions',
      entityId: subscription.id,
      success: true,
      previousState,
      newState: updated,
    });
  }

  async pauseSubscription(dealerTelegramId: bigint, subscriptionId: string) {
    const subscription = await this.getOwnedSubscriptionOrThrow(
      dealerTelegramId,
      subscriptionId,
    );

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('Подписка не активна.');
    }

    const now = dayjs();
    const exp = dayjs(subscription.expiresAt);
    const remainingSeconds = exp.diff(now, 'second');

    if (remainingSeconds <= 0) {
      throw new BadRequestException('Подписка уже истекла.');
    }

    await this.remnawaveService.disableUser(subscription.remnawaveUserId);

    const updated = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.PAUSED,
        pausedAt: now.toDate(),
        remainingSeconds,
      },
    });

    await this.auditService.record({
      actorId: dealerTelegramId,
      actorRole: 'dealer',
      action: 'SUBSCRIPTION_PAUSE',
      entity: 'subscriptions',
      entityId: subscription.id,
      success: true,
      previousState: {
        status: subscription.status,
        expiresAt: subscription.expiresAt,
      },
      newState: updated,
      metadata: {
        remainingSeconds,
      },
    });

    return updated;
  }

  async resumeSubscription(dealerTelegramId: bigint, subscriptionId: string) {
    const subscription = await this.getOwnedSubscriptionOrThrow(
      dealerTelegramId,
      subscriptionId,
    );

    if (subscription.status !== SubscriptionStatus.PAUSED) {
      throw new BadRequestException('Подписка не находится в паузе.');
    }

    await this.remnawaveService.enableUser(subscription.remnawaveUserId);

    const hasSavedRemainingSeconds =
      typeof subscription.remainingSeconds === 'number' &&
      subscription.remainingSeconds > 0;
    const newExpiresAt = hasSavedRemainingSeconds
      ? dayjs().add(subscription.remainingSeconds!, 'second').toDate()
      : subscription.expiresAt;

    if (hasSavedRemainingSeconds) {
      await this.remnawaveService.updateUserExpiry(
        subscription.remnawaveUserId,
        newExpiresAt,
      );
    }

    const updated = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        pausedAt: null,
        remainingSeconds: null,
        expiresAt: newExpiresAt,
      },
    });

    await this.auditService.record({
      actorId: dealerTelegramId,
      actorRole: 'dealer',
      action: 'SUBSCRIPTION_RESUME',
      entity: 'subscriptions',
      entityId: subscription.id,
      success: true,
      previousState: {
        status: subscription.status,
        expiresAt: subscription.expiresAt,
        remainingSeconds: subscription.remainingSeconds,
      },
      newState: updated,
      metadata: {
        newExpiresAt,
      },
    });

    return updated;
  }

  async getSubscriptionExpiry(dealerTelegramId: bigint, subscriptionId: string) {
    const subscription = await this.getOwnedSubscriptionOrThrow(
      dealerTelegramId,
      subscriptionId,
    );
    return {
      id: subscription.id,
      status: subscription.status,
      expiresAt: subscription.expiresAt,
      remainingSeconds: subscription.remainingSeconds,
    };
  }

  async getSubscriptionLinkForDealer(
    dealerTelegramId: bigint,
    subscriptionId: string,
  ): Promise<string> {
    const subscription = await this.getOwnedSubscriptionOrThrow(
      dealerTelegramId,
      subscriptionId,
    );

    const subscriptionUrl = await this.remnawaveService.getUserSubscriptionUrl(
      subscription.remnawaveUserId,
    );
    if (!subscriptionUrl) {
      throw new NotFoundException(
        'Подписка уже удалена в панели Remnawave. Список обновлен.',
      );
    }

    return this.happCryptoService.encryptSubscriptionUrl(subscriptionUrl);
  }

  private async getDealerOrThrow(dealerTelegramId: bigint) {
    const dealer = await this.dealersService.getDealerByTelegramId(dealerTelegramId);
    if (!dealer) {
      throw new NotFoundException('Дилер не найден');
    }

    return dealer;
  }

  private async getOwnedSubscriptionOrThrow(dealerTelegramId: bigint, subscriptionId: string) {
    const dealer = await this.getDealerOrThrow(dealerTelegramId);

    const subscription = await this.prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        dealerId: dealer.id,
        status: { not: SubscriptionStatus.DELETED },
      },
      include: { dealerUser: true },
    });

    if (!subscription) {
      throw new NotFoundException('Подписка не найдена');
    }

    const exists = await this.syncSubscriptionWithRemnawave(
      subscription.id,
      subscription.remnawaveUserId,
    );
    if (!exists) {
      throw new NotFoundException(
        'Подписка уже удалена в панели Remnawave. Список обновлен.',
      );
    }

    return this.prisma.subscription.findUniqueOrThrow({
      where: { id: subscription.id },
      include: { dealerUser: true },
    });
  }

  private async syncSubscriptionsForDealer(dealerId: string): Promise<void> {
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        dealerId,
        status: { not: SubscriptionStatus.DELETED },
      },
      select: {
        id: true,
        remnawaveUserId: true,
        status: true,
        expiresAt: true,
        pausedAt: true,
        remainingSeconds: true,
      },
    });

    if (subscriptions.length === 0) {
      return;
    }

    const syncResults = (
      await Promise.all(
        subscriptions.map(async (subscription) => ({
          subscription,
          remote: await this.remnawaveService.getUserState(subscription.remnawaveUserId),
        })),
      )
    );

    await Promise.all(
      syncResults.map(async ({ subscription, remote }) => {
        if (!remote.exists) {
          await this.prisma.subscription.updateMany({
            where: {
              id: subscription.id,
              status: { not: SubscriptionStatus.DELETED },
            },
            data: {
              status: SubscriptionStatus.DELETED,
            },
          });
          return;
        }

        const nextStatus =
          remote.status === 'DISABLED'
            ? SubscriptionStatus.PAUSED
            : SubscriptionStatus.ACTIVE;
        const nextExpiresAt = remote.expireAt ?? subscription.expiresAt;
        const shouldClearPauseMeta = nextStatus === SubscriptionStatus.ACTIVE;
        const changed =
          subscription.status !== nextStatus ||
          subscription.expiresAt.getTime() !== nextExpiresAt.getTime() ||
          (shouldClearPauseMeta &&
            (subscription.pausedAt !== null || subscription.remainingSeconds !== null));

        if (!changed) {
          return;
        }

        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: nextStatus,
            expiresAt: nextExpiresAt,
            pausedAt: shouldClearPauseMeta ? null : subscription.pausedAt,
            remainingSeconds: shouldClearPauseMeta
              ? null
              : subscription.remainingSeconds,
          },
        });
      }),
    );
  }

  private async syncSubscriptionWithRemnawave(
    subscriptionId: string,
    remnawaveUserId: string,
  ): Promise<boolean> {
    const remote = await this.remnawaveService.getUserState(remnawaveUserId);
    if (!remote.exists) {
      await this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: SubscriptionStatus.DELETED,
        },
      });

      return false;
    }

    const current = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: {
        status: true,
        expiresAt: true,
        pausedAt: true,
        remainingSeconds: true,
      },
    });

    if (!current) {
      return false;
    }

    const nextStatus =
      remote.status === 'DISABLED'
        ? SubscriptionStatus.PAUSED
        : SubscriptionStatus.ACTIVE;
    const nextExpiresAt = remote.expireAt ?? current.expiresAt;
    const shouldClearPauseMeta = nextStatus === SubscriptionStatus.ACTIVE;
    const changed =
      current.status !== nextStatus ||
      current.expiresAt.getTime() !== nextExpiresAt.getTime() ||
      (shouldClearPauseMeta &&
        (current.pausedAt !== null || current.remainingSeconds !== null));

    if (!changed) {
      return true;
    }

    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: nextStatus,
        expiresAt: nextExpiresAt,
        pausedAt: shouldClearPauseMeta ? null : current.pausedAt,
        remainingSeconds: shouldClearPauseMeta ? null : current.remainingSeconds,
      },
    });

    return true;
  }
}
