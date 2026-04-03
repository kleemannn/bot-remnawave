import { Module } from '@nestjs/common';
import { BotUpdate } from './bot.update';
import { AuthModule } from '../auth/auth.module';
import { DealersModule } from '../dealers/dealers.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AdminGuard } from '../common/guards/admin.guard';
import { DealerGuard } from '../common/guards/dealer.guard';

@Module({
  imports: [AuthModule, DealersModule, SubscriptionsModule],
  providers: [BotUpdate, AdminGuard, DealerGuard],
})
export class BotModule {}
