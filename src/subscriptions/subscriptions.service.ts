import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DealerTag, SubscriptionStatus } from '@prisma/client';
import dayjs from 'dayjs';
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
    const remote = await this.remnawaveService.createUser({
      username: dto.username,
      squadId,
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

      await tx.auditLog.create({
        data: {
          actorId: dealerTelegramId,
          action: 'SUBSCRIPTION_CREATE',
          entity: 'subscriptions',
          entityId: subscription.id,
          metadata: {
            username: dto.username,
            days: dto.days,
            remnawaveUserId: remote.userId,
          },
        },
      });

      return subscription;
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

    return this.prisma.subscription.findMany({
      where: { dealerId: dealer.id, status: { not: SubscriptionStatus.DELETED } },
      include: { dealerUser: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteSubscription(dealerTelegramId: bigint, subscriptionId: string): Promise<void> {
    const subscription = await this.getOwnedSubscriptionOrThrow(
      dealerTelegramId,
      subscriptionId,
    );

    await this.remnawaveService.deleteUser(subscription.remnawaveUserId);

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.DELETED,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: dealerTelegramId,
        action: 'SUBSCRIPTION_DELETE',
        entity: 'subscriptions',
        entityId: subscription.id,
      },
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

    await this.prisma.auditLog.create({
      data: {
        actorId: dealerTelegramId,
        action: 'SUBSCRIPTION_PAUSE',
        entity: 'subscriptions',
        entityId: subscription.id,
        metadata: {
          remainingSeconds,
        },
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

    if (!subscription.remainingSeconds || subscription.remainingSeconds <= 0) {
      throw new BadRequestException('Невозможно возобновить: нет сохраненного остатка времени.');
    }

    const newExpiresAt = dayjs().add(subscription.remainingSeconds, 'second').toDate();

    await this.remnawaveService.enableUser(subscription.remnawaveUserId);
    await this.remnawaveService.updateUserExpiry(
      subscription.remnawaveUserId,
      newExpiresAt,
    );

    const updated = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        pausedAt: null,
        remainingSeconds: null,
        expiresAt: newExpiresAt,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: dealerTelegramId,
        action: 'SUBSCRIPTION_RESUME',
        entity: 'subscriptions',
        entityId: subscription.id,
        metadata: {
          newExpiresAt,
        },
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

  private async getOwnedSubscriptionOrThrow(dealerTelegramId: bigint, subscriptionId: string) {
    const dealer = await this.dealersService.getDealerByTelegramId(dealerTelegramId);
    if (!dealer) {
      throw new NotFoundException('Дилер не найден');
    }

    const subscription = await this.prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        dealerId: dealer.id,
      },
      include: { dealerUser: true },
    });

    if (!subscription) {
      throw new NotFoundException('Подписка не найдена');
    }

    return subscription;
  }
}
