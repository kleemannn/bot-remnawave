import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { WebappController } from './webapp.controller';
import { WebappAuthService } from './webapp-auth.service';
import { WebappService } from './webapp.service';
import { WebappAuthGuard } from './guards/webapp-auth.guard';

@Module({
  imports: [AuthModule, SubscriptionsModule],
  controllers: [WebappController],
  providers: [WebappAuthService, WebappService, WebappAuthGuard],
})
export class WebappModule {}
