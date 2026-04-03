import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationType } from '@prisma/client';
import dayjs from 'dayjs';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly reminderDays = [7, 3, 1];

  constructor(
    private readonly prisma: PrismaService,
    @InjectBot() private readonly bot: Telegraf,
  ) {}

  @Cron('0 0 10 * * *')
  async sendDealerExpiryReminders() {
    const now = dayjs();

    const dealers = await this.prisma.dealer.findMany({
      where: {
        isActive: true,
      },
    });

    for (const dealer of dealers) {
      const expiresAt = dayjs(dealer.expiresAt);
      const daysLeft = expiresAt.startOf('day').diff(now.startOf('day'), 'day');

      if (!this.reminderDays.includes(daysLeft)) {
        continue;
      }

      const expiresOn = expiresAt.startOf('day').toDate();

      const existing = await this.prisma.notification.findUnique({
        where: {
          dealerId_type_daysBefore_expiresOn: {
            dealerId: dealer.id,
            type: NotificationType.DEALER_EXPIRY,
            daysBefore: daysLeft,
            expiresOn,
          },
        },
      });

      if (existing) {
        continue;
      }

      const text =
        `Напоминание: доступ дилера истекает через ${daysLeft} дн.\n` +
        `Дата истечения: ${expiresAt.format('YYYY-MM-DD HH:mm')}`;

      try {
        await this.bot.telegram.sendMessage(Number(dealer.telegramId), text);

        await this.prisma.notification.create({
          data: {
            dealerId: dealer.id,
            type: NotificationType.DEALER_EXPIRY,
            daysBefore: daysLeft,
            expiresOn,
          },
        });

        await this.prisma.auditLog.create({
          data: {
            action: 'NOTIFICATION_SENT',
            entity: 'notifications',
            entityId: dealer.id,
            actorId: null,
            metadata: {
              dealerTelegramId: dealer.telegramId.toString(),
              daysLeft,
            },
          },
        });
      } catch (error) {
        this.logger.error(
          `Failed to send notification to dealer ${dealer.telegramId.toString()}`,
          error,
        );
      }
    }
  }
}
