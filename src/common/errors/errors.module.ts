import { Global, Module } from '@nestjs/common';
import { BotErrorMapperService } from './bot-error-mapper.service';

@Global()
@Module({
  providers: [BotErrorMapperService],
  exports: [BotErrorMapperService],
})
export class ErrorsModule {}
