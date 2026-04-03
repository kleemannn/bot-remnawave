import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DuplicateActionException,
  RateLimitExceededException,
} from '../../common/errors/app-exceptions';

type EventKind = 'text' | 'callback' | 'command';

interface RateBucket {
  startedAt: number;
  count: number;
}

@Injectable()
export class BotProtectionService {
  private readonly buckets = new Map<string, RateBucket>();
  private readonly actionLocks = new Map<string, number>();

  constructor(private readonly configService: ConfigService) {}

  enforceInboundRateLimit(userId: string, kind: EventKind) {
    const windowMs = this.configService.get<number>('telegram.throttling.windowMs', 10000);
    const limit = this.getLimit(kind);
    const key = `${userId}:${kind}`;
    const now = Date.now();

    const bucket = this.buckets.get(key);
    if (!bucket || now - bucket.startedAt > windowMs) {
      this.buckets.set(key, { startedAt: now, count: 1 });
      return;
    }

    if (bucket.count >= limit) {
      throw new RateLimitExceededException();
    }

    bucket.count += 1;
  }

  async runExpensiveAction<T>(userId: string, actionKey: string, fn: () => Promise<T>) {
    const cooldownMs = this.configService.get<number>(
      'telegram.throttling.expensiveActionCooldownMs',
      3000,
    );
    const lockKey = `${userId}:${actionKey}`;
    const now = Date.now();
    const lockedUntil = this.actionLocks.get(lockKey);

    if (typeof lockedUntil === 'number' && lockedUntil > now) {
      throw new DuplicateActionException();
    }

    this.actionLocks.set(lockKey, now + cooldownMs);

    try {
      return await fn();
    } catch (error) {
      this.actionLocks.set(lockKey, Date.now() + cooldownMs);
      throw error;
    }
  }

  private getLimit(kind: EventKind): number {
    switch (kind) {
      case 'callback':
        return this.configService.get<number>('telegram.throttling.maxCallbacks', 24);
      case 'command':
        return this.configService.get<number>('telegram.throttling.maxCommands', 12);
      case 'text':
      default:
        return this.configService.get<number>('telegram.throttling.maxTexts', 12);
    }
  }
}
