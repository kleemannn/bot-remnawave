import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  @Get('health')
  live() {
    return {
      status: 'ok',
      mode: 'live',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: this.configService.get<string>('app.version', 'unknown'),
    };
  }

  @Get('health/ready')
  async ready() {
    const timeoutMs = this.configService.get<number>('app.healthcheckDbTimeoutMs', 3000);

    await Promise.race([
      this.prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new ServiceUnavailableException('DB readiness timeout')), timeoutMs),
      ),
    ]);

    return {
      status: 'ok',
      mode: 'ready',
      db: 'up',
      timestamp: new Date().toISOString(),
    };
  }
}
