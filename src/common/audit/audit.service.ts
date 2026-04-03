import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditEntry {
  actorId?: bigint | null;
  actorRole: 'admin' | 'dealer' | 'system';
  action: string;
  entity: string;
  entityId?: string | null;
  success: boolean;
  previousState?: unknown;
  newState?: unknown;
  metadata?: unknown;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry) {
    await this.prisma.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        metadata: {
          actorRole: entry.actorRole,
          success: entry.success,
          previousState: entry.previousState,
          newState: entry.newState,
          details: entry.metadata,
        } as object,
      },
    });
  }
}
