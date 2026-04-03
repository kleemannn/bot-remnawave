import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationType } from '@prisma/client';
import dayjs from 'dayjs';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { AuditService } from '../common/audit/audit.service';
import { AppLoggerService } from '../common/logger/app-logger.service';
import { PrismaService } from '../prisma/prisma.service';

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
}
