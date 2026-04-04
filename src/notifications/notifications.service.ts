import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationType, SubscriptionStatus } from '@prisma/client';
import dayjs from 'dayjs';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { AuditService } from '../common/audit/audit.service';
import { AppLoggerService } from '../common/logger/app-logger.service';
import { PrismaService } from '../prisma/prisma.service';
import { callbackData } from '../bot/utils/callback-data.util';
import { inlineKeyboard } from '../bot/keyboards/common.keyboards';
import { BotText } from '../bot/messages/bot-text';

@Injectable()
export class NotificationsService {
  private readonly reminderDays = [7, 3, 1];
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly logger: AppLoggerService,
    @InjectBot() private readonly bot: Telegraf,
  ) {}

  @Cron('0 0 10 * * *')
  async sendDealerExpiryReminders() {
    if (this.isRunning) {
      this.logger.warnEvent('dealer_expiry_reminders_skipped_overlap', undefined, NotificationsService.name);
      return;
    }

    this.isRunning = true;
    const now = dayjs();
    let sentCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    try {
      const dealers = await this.prisma.dealer.findMany({
        where: {
          isActive: true,
        },
      });

      this.logger.logEvent(
        'dealer_expiry_reminders_started',
        { dealersCount: dealers.length },
        NotificationsService.name,
      );

      for (const dealer of dealers) {
        const expiresAt = dayjs(dealer.expiresAt);
        const daysLeft = expiresAt.startOf('day').diff(now.startOf('day'), 'day');

        if (!this.reminderDays.includes(daysLeft)) {
          skippedCount += 1;
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
          skippedCount += 1;
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

          await this.auditService.record({
            action: 'NOTIFICATION_SENT',
            actorRole: 'system',
            entity: 'notifications',
            entityId: dealer.id,
            actorId: null,
            success: true,
            metadata: {
              dealerTelegramId: dealer.telegramId.toString(),
              daysLeft,
            },
          });
          sentCount += 1;
        } catch (error) {
          failedCount += 1;
          this.logger.errorEvent(
            'dealer_expiry_reminder_failed',
            {
              dealerTelegramId: dealer.telegramId.toString(),
              daysLeft,
            },
            error instanceof Error ? error.stack : undefined,
            NotificationsService.name,
          );
        }
      }
      this.logger.logEvent(
        'dealer_expiry_reminders_finished',
        {
          dealersCount: dealers.length,
          sentCount,
          skippedCount,
          failedCount,
        },
        NotificationsService.name,
      );
    } finally {
      this.isRunning = false;
    }
  }

  @Cron('0 */10 * * * *')
  async sendExpiredSubscriptionNotifications() {
    const now = new Date();

    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        expiresAt: { lte: now },
      },
      include: {
        dealer: true,
        dealerUser: true,
      },
    });

    for (const subscription of subscriptions) {
      const alreadySent = await this.prisma.auditLog.findFirst({
        where: {
          action: 'SUBSCRIPTION_EXPIRED_NOTICE',
          entity: 'subscriptions',
          entityId: subscription.id,
          createdAt: {
            gte: subscription.expiresAt,
          },
        },
      });

      if (alreadySent) {
        continue;
      }

      try {
        await this.bot.telegram.sendMessage(
          Number(subscription.dealer.telegramId),
          BotText.subscriptionExpiredNotification(
            subscription.dealerUser.username,
            subscription.expiresAt,
          ),
          inlineKeyboard([
            [
              {
                text: '📦 Открыть подписку',
                callback_data: callbackData.subscriptionCard(subscription.id),
              },
            ],
          ]) as any,
        );

        await this.auditService.record({
          action: 'SUBSCRIPTION_EXPIRED_NOTICE',
          actorRole: 'system',
          entity: 'subscriptions',
          entityId: subscription.id,
          actorId: null,
          success: true,
          metadata: {
            dealerTelegramId: subscription.dealer.telegramId.toString(),
            username: subscription.dealerUser.username,
            expiresAt: subscription.expiresAt,
          },
        });
      } catch (error) {
        this.logger.errorEvent(
          'subscription_expiry_notice_failed',
          {
            subscriptionId: subscription.id,
            dealerTelegramId: subscription.dealer.telegramId.toString(),
          },
          error instanceof Error ? error.stack : undefined,
          NotificationsService.name,
        );
      }
    }
  }
}
