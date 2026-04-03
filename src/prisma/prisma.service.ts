import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AppLoggerService } from '../common/logger/app-logger.service';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private readonly logger: AppLoggerService) {
    super();
  }

  async onModuleInit() {
    this.logger.logEvent('prisma_connecting', undefined, PrismaService.name);
    await this.$connect();
    this.logger.logEvent('prisma_connected', undefined, PrismaService.name);
  }

  async onModuleDestroy() {
    this.logger.logEvent('prisma_disconnecting', undefined, PrismaService.name);
    await this.$disconnect();
    this.logger.logEvent('prisma_disconnected', undefined, PrismaService.name);
  }
}
