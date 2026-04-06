import { Injectable, NotFoundException } from '@nestjs/common';
import { Dealer, DealerTag, SubscriptionStatus } from '@prisma/client';
import dayjs from 'dayjs';
import { AuditService } from '../common/audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { AddDealerDto } from './dto/add-dealer.dto';

@Injectable()
export class DealersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async addDealer(dto: AddDealerDto, actorId?: bigint): Promise<Dealer> {
    const expiresAt = dayjs().add(dto.accessDays, 'day').toDate();
    const previous = await this.prisma.dealer.findUnique({
      where: { telegramId: BigInt(dto.telegramId) },
    });

    const dealer = await this.prisma.dealer.upsert({
      where: { telegramId: BigInt(dto.telegramId) },
      update: {
        username: dto.username,
        tag: dto.tag,
        keyLimit: dto.keyLimit,
        expiresAt,
        isActive: true,
      },
      create: {
        telegramId: BigInt(dto.telegramId),
        username: dto.username,
        tag: dto.tag,
        keyLimit: dto.keyLimit,
        expiresAt,
      },
    });

    await this.auditService.record({
      actorId,
      actorRole: 'admin',
      action: 'DEALER_ADD',
      entity: 'dealers',
      entityId: dealer.id,
      success: true,
      previousState: previous,
      newState: dealer,
      metadata: dto,
    });
    return dealer;
  }

  async deleteDealer(telegramId: bigint, actorId?: bigint): Promise<void> {
    const dealer = await this.prisma.dealer.findUnique({ where: { telegramId } });
    if (!dealer) {
      throw new NotFoundException('Дилер не найден');
    }

    await this.prisma.dealer.delete({ where: { id: dealer.id } });
    await this.auditService.record({
      actorId,
      actorRole: 'admin',
      action: 'DEALER_DELETE',
      entity: 'dealers',
      entityId: dealer.id,
      success: true,
      previousState: dealer,
      newState: null,
      metadata: {
        telegramId: telegramId.toString(),
      },
    });
  }

  async setActive(telegramId: bigint, active: boolean, actorId?: bigint): Promise<Dealer> {
    const previous = await this.prisma.dealer.findUnique({ where: { telegramId } });
    if (!previous) {
      throw new NotFoundException('Дилер не найден');
    }

    const dealer = await this.prisma.dealer.update({
      where: { telegramId },
      data: { isActive: active },
    });

    await this.auditService.record({
      actorId,
      actorRole: 'admin',
      action: active ? 'DEALER_ACTIVATE' : 'DEALER_DEACTIVATE',
      entity: 'dealers',
      entityId: dealer.id,
      success: true,
      previousState: previous,
      newState: dealer,
      metadata: {
        telegramId: telegramId.toString(),
      },
    });

    return dealer;
  }

  async setTag(telegramId: bigint, tag: DealerTag, actorId?: bigint): Promise<Dealer> {
    const previous = await this.prisma.dealer.findUnique({ where: { telegramId } });
    if (!previous) {
      throw new NotFoundException('Дилер не найден');
    }

    const dealer = await this.prisma.dealer.update({
      where: { telegramId },
      data: { tag },
    });

    await this.auditService.record({
      actorId,
      actorRole: 'admin',
      action: 'DEALER_SET_TAG',
      entity: 'dealers',
      entityId: dealer.id,
      success: true,
      previousState: previous,
      newState: dealer,
      metadata: {
        telegramId: telegramId.toString(),
        tag,
      },
    });

    return dealer;
  }

  async setKeyLimit(telegramId: bigint, keyLimit: number, actorId?: bigint): Promise<Dealer> {
    const previous = await this.prisma.dealer.findUnique({ where: { telegramId } });
    if (!previous) {
      throw new NotFoundException('Дилер не найден');
    }

    const dealer = await this.prisma.dealer.update({
      where: { telegramId },
      data: { keyLimit },
    });

    await this.auditService.record({
      actorId,
      actorRole: 'admin',
      action: 'DEALER_SET_LIMIT',
      entity: 'dealers',
      entityId: dealer.id,
      success: true,
      previousState: previous,
      newState: dealer,
      metadata: {
        telegramId: telegramId.toString(),
        keyLimit,
      },
    });

    return dealer;
  }

  async extendAccess(telegramId: bigint, days: number, actorId?: bigint): Promise<Dealer> {
    const dealer = await this.prisma.dealer.findUnique({ where: { telegramId } });
    if (!dealer) {
      throw new NotFoundException('Дилер не найден');
    }

    const baseDate = dealer.expiresAt > new Date() ? dealer.expiresAt : new Date();
    const expiresAt = dayjs(baseDate).add(days, 'day').toDate();

    const updated = await this.prisma.dealer.update({
      where: { id: dealer.id },
      data: { expiresAt },
    });

    await this.auditService.record({
      actorId,
      actorRole: 'admin',
      action: 'DEALER_EXTEND',
      entity: 'dealers',
      entityId: dealer.id,
      success: true,
      previousState: dealer,
      newState: updated,
      metadata: {
        telegramId: telegramId.toString(),
        days,
        expiresAt,
      },
    });

    return updated;
  }

  async setExpiresAt(
    telegramId: bigint,
    expiresAt: Date,
    actorId?: bigint,
  ): Promise<Dealer> {
    const dealer = await this.prisma.dealer.findUnique({ where: { telegramId } });
    if (!dealer) {
      throw new NotFoundException('Дилер не найден');
    }

    const updated = await this.prisma.dealer.update({
      where: { id: dealer.id },
      data: { expiresAt },
    });

    await this.auditService.record({
      actorId,
      actorRole: 'admin',
      action: 'DEALER_SET_EXPIRATION',
      entity: 'dealers',
      entityId: dealer.id,
      success: true,
      previousState: dealer,
      newState: updated,
      metadata: {
        telegramId: telegramId.toString(),
        expiresAt,
      },
    });

    return updated;
  }

  async getDealerByTelegramId(telegramId: bigint): Promise<Dealer | null> {
    const dealer = await this.prisma.dealer.findUnique({ where: { telegramId } });
    if (!dealer) {
      return null;
    }

    return this.syncDealerCreatedCount(dealer);
  }

  async listDealers(page = 1, pageSize = 6) {
    const total = await this.prisma.dealer.count();
    const pageCount = Math.max(Math.ceil(total / pageSize), 1);
    const currentPage = Math.min(Math.max(page, 1), pageCount);

    const items = await this.prisma.dealer.findMany({
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
    });

    const syncedItems = await Promise.all(
      items.map((dealer) => this.syncDealerCreatedCount(dealer)),
    );

    return {
      items: syncedItems,
      total,
      page: currentPage,
      pageCount,
    };
  }

  isDealerBlocked(dealer: Dealer): { blocked: boolean; reason?: string } {
    if (!dealer.isActive) {
      return { blocked: true, reason: 'Ваш доступ деактивирован администратором.' };
    }

    if (dealer.expiresAt < new Date()) {
      return { blocked: true, reason: 'Срок вашего дилерского доступа истек.' };
    }

    if (dealer.createdCount >= dealer.keyLimit) {
      return { blocked: true, reason: 'Вы достигли лимита создания ключей.' };
    }

    return { blocked: false };
  }

  async getStats() {
    const [total, active, expired, premium, standard] = await Promise.all([
      this.prisma.dealer.count(),
      this.prisma.dealer.count({ where: { isActive: true, expiresAt: { gt: new Date() } } }),
      this.prisma.dealer.count({ where: { expiresAt: { lte: new Date() } } }),
      this.prisma.dealer.count({ where: { tag: DealerTag.PREMIUM } }),
      this.prisma.dealer.count({ where: { tag: DealerTag.STANDARD } }),
    ]);

    return { total, active, expired, premium, standard };
  }

  private async syncDealerCreatedCount(dealer: Dealer): Promise<Dealer> {
    const actualCreatedCount = await this.prisma.subscription.count({
      where: {
        dealerId: dealer.id,
        status: { not: SubscriptionStatus.DELETED },
      },
    });

    if (dealer.createdCount === actualCreatedCount) {
      return dealer;
    }

    return this.prisma.dealer.update({
      where: { id: dealer.id },
      data: { createdCount: actualCreatedCount },
    });
  }
}
