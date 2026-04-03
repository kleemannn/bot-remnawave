import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { HappCryptoService } from './happ-crypto.service';

@Module({
  imports: [HttpModule],
  providers: [HappCryptoService],
  exports: [HappCryptoService],
})
export class HappModule {}
