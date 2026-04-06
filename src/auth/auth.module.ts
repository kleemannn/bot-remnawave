import { Module } from '@nestjs/common';
import { DealersModule } from '../dealers/dealers.module';
import { AuthService } from './auth.service';

@Module({
  imports: [DealersModule],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
