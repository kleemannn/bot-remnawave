import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RemnawaveService } from './remnawave.service';
import { RemnawaveAdapter } from './adapters/remnawave.adapter';

@Module({
  imports: [HttpModule],
  providers: [RemnawaveService, RemnawaveAdapter],
  exports: [RemnawaveService],
})
export class RemnawaveModule {}
