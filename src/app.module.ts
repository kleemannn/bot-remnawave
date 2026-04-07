import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TelegrafModule } from 'nestjs-telegraf';
import { session } from 'telegraf';
import configuration from './common/config/configuration';
import { validateEnv } from './common/config/env.validation';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
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
import { WebappModule } from './webapp/webapp.module';

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
    TelegrafModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        token: configService.getOrThrow<string>('telegram.botToken'),
        middlewares: [session()],
      }),
    }),
    PrismaModule,
    AuthModule,
    DealersModule,
    SubscriptionsModule,
    RemnawaveModule,
    HappModule,
    BotModule,
    NotificationsModule,
    HealthModule,
    WebappModule,
  ],
})
export class AppModule {}
