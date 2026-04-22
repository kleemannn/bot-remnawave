import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { DealersModule } from '../dealers/dealers.module';
import { RemnawaveModule } from '../remnawave/remnawave.module';

@Module({
  imports: [DealersModule, RemnawaveModule],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
