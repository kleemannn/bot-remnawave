import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { DealersModule } from '../dealers/dealers.module';
import { RemnawaveModule } from '../remnawave/remnawave.module';
import { HappModule } from '../happ/happ.module';

@Module({
  imports: [DealersModule, RemnawaveModule, HappModule],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
