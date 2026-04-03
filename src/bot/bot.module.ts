import { Module } from '@nestjs/common';
import { BotUpdate } from './bot.update';
import { AuthModule } from '../auth/auth.module';
import { DealersModule } from '../dealers/dealers.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AdminGuard } from '../common/guards/admin.guard';
import { DealerGuard } from '../common/guards/dealer.guard';
import { MenuHandler } from './handlers/menu.handler';
import { DealerProfileHandler } from './handlers/dealer-profile.handler';
import { SubscriptionsHandler } from './handlers/subscriptions.handler';
import { AdminHandler } from './handlers/admin.handler';
import { BotAccessHandler } from './handlers/bot-access.handler';

@Module({
  imports: [AuthModule, DealersModule, SubscriptionsModule],
  providers: [
    BotUpdate,
    MenuHandler,
    DealerProfileHandler,
    SubscriptionsHandler,
    AdminHandler,
    BotAccessHandler,
    AdminGuard,
    DealerGuard,
  ],
})
export class BotModule {}
