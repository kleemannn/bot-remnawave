import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TelegrafModule } from 'nestjs-telegraf';
import { session } from 'telegraf';
import { Prisma } from '@prisma/client';
import configuration from './common/config/configuration';
import { validateEnv } from './common/config/env.validation';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { DealersModule } from './dealers/dealers.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { RemnawaveModule } from './remnawave/remnawave.module';
import { BotModule } from './bot/bot.module';
import { NotificationsModule } from './notifications/notifications.module';
import { LoggerModule } from './common/logger/logger.module';
import { HappModule } from './happ/happ.module';
import { HealthModule } from './health/health.module';
import { ErrorsModule } from './common/errors/errors.module';
import { AuditModule } from './common/audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    LoggerModule,
    ErrorsModule,
    AuditModule,
    ScheduleModule.forRoot(),
    PrismaModule,
    TelegrafModule.forRootAsync({
      inject: [ConfigService, PrismaService],
      useFactory: (configService: ConfigService, prismaService: PrismaService) => ({
        token: configService.getOrThrow<string>('telegram.botToken'),
        middlewares: [
          session({
            getSessionKey: (ctx) => {
              if (!ctx.from || !ctx.chat) {
                return undefined;
              }

              return `${ctx.from.id}:${ctx.chat.id}`;
            },
            store: {
              get: async (key) => {
                const record = await prismaService.telegramSession.findUnique({
                  where: { key },
                });

                return (record?.data ?? undefined) as Record<string, unknown> | undefined;
              },
              set: async (key, value) => {
                await prismaService.telegramSession.upsert({
                  where: { key },
                  update: {
                    data: value as Prisma.InputJsonValue,
                  },
                  create: {
                    key,
                    data: value as Prisma.InputJsonValue,
                  },
                });
              },
              delete: async (key) => {
                await prismaService.telegramSession.deleteMany({
                  where: { key },
                });
              },
            },
          }),
        ],
      }),
    }),
    AuthModule,
    DealersModule,
    SubscriptionsModule,
    RemnawaveModule,
    HappModule,
    BotModule,
    NotificationsModule,
    HealthModule,
  ],
})
export class AppModule {}
