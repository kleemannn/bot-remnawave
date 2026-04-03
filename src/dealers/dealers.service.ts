import { Injectable, NotFoundException } from '@nestjs/common';
import { Dealer, DealerTag } from '@prisma/client';
import dayjs from 'dayjs';
import { PrismaService } from '../prisma/prisma.service';
import { AddDealerDto } from './dto/add-dealer.dto';

@Injectable()
export class DealersService {
  constructor(private readonly prisma: PrismaService) {}

  async addDealer(dto: AddDealerDto, actorId?: bigint): Promise<Dealer> {
    const expiresAt = dayjs().add(dto.accessDays, 'day').toDate();

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

    await this.audit(actorId, 'DEALER_ADD', 'dealers', dealer.id, dto);
    return dealer;
  }

  async deleteDealer(telegramId: bigint, actorId?: bigint): Promise<void> {
    const dealer = await this.prisma.dealer.findUnique({ where: { telegramId } });
    if (!dealer) {
      throw new NotFoundException('Дилер не найден');
    }

    await this.prisma.dealer.delete({ where: { id: dealer.id } });
    await this.audit(actorId, 'DEALER_DELETE', 'dealers', dealer.id, {
      telegramId: telegramId.toString(),
    });
  }

  async setActive(telegramId: bigint, active: boolean, actorId?: bigint): Promise<Dealer> {
    const dealer = await this.prisma.dealer.update({
      where: { telegramId },
      data: { isActive: active },
    });

    await this.audit(actorId, active ? 'DEALER_ACTIVATE' : 'DEALER_DEACTIVATE', 'dealers', dealer.id, {
      telegramId: telegramId.toString(),
    });

    return dealer;
  }

  async setTag(telegramId: bigint, tag: DealerTag, actorId?: bigint): Promise<Dealer> {
    const dealer = await this.prisma.dealer.update({
      where: { telegramId },
      data: { tag },
    });

    await this.audit(actorId, 'DEALER_SET_TAG', 'dealers', dealer.id, {
      telegramId: telegramId.toString(),
      tag,
    });

    return dealer;
  }

  async setKeyLimit(telegramId: bigint, keyLimit: number, actorId?: bigint): Promise<Dealer> {
    const dealer = await this.prisma.dealer.update({
      where: { telegramId },
      data: { keyLimit },
    });

    await this.audit(actorId, 'DEALER_SET_LIMIT', 'dealers', dealer.id, {
      telegramId: telegramId.toString(),
      keyLimit,
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

    await this.audit(actorId, 'DEALER_EXTEND', 'dealers', dealer.id, {
      telegramId: telegramId.toString(),
      days,
      expiresAt,
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

    await this.audit(actorId, 'DEALER_SET_EXPIRATION', 'dealers', dealer.id, {
      telegramId: telegramId.toString(),
      expiresAt,
    });

    return updated;
  }

  async getDealerByTelegramId(telegramId: bigint): Promise<Dealer | null> {
    return this.prisma.dealer.findUnique({ where: { telegramId } });
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

    return {
      items,
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

  private async audit(
    actorId: bigint | undefined,
    action: string,
    entity: string,
    entityId: string,
    metadata?: unknown,
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action,
        entity,
        entityId,
        metadata: metadata as object | undefined,
      },
    });
  }
}
