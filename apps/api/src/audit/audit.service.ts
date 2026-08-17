import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditLogEntity } from "./entities/audit-log.entity";

export type AuditRecordInput = {
  action: string;
  actorId?: string | null;
  actorRole?: string | null;
  entityId?: string | null;
  entityType: string;
  metadata?: Record<string, unknown> | null;
  reason?: string | null;
};

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditRepository: Repository<AuditLogEntity>
  ) {}

  async record(input: AuditRecordInput) {
    const log = this.auditRepository.create({
      action: input.action,
      actorId: input.actorId ?? null,
      actorRole: input.actorRole ?? "system",
      entityId: input.entityId ?? null,
      entityType: input.entityType,
      metadata: input.metadata ?? null,
      reason: input.reason ?? null
    });

    return this.auditRepository.save(log);
  }

  async findLatest(input: number | { action?: string; actorRole?: string; entityType?: string; limit?: number } = 100) {
    const filters = typeof input === "number" ? { limit: input } : input;
    const take = Math.min(Math.max(filters.limit ?? 100, 1), 200);
    const logs = await this.auditRepository.find({
      order: {
        createdAt: "DESC"
      },
      where: {
        ...(filters.action
          ? {
              action: filters.action
            }
          : {}),
        ...(filters.actorRole
          ? {
              actorRole: filters.actorRole
            }
          : {}),
        ...(filters.entityType
          ? {
              entityType: filters.entityType
            }
          : {})
      },
      take
    });

    return logs.map((log) => this.toResponse(log));
  }

  private toResponse(log: AuditLogEntity) {
    return {
      action: log.action,
      actorId: log.actorId,
      actorRole: log.actorRole,
      createdAt: log.createdAt,
      entityId: log.entityId,
      entityType: log.entityType,
      id: log.id,
      metadata: log.metadata,
      reason: log.reason
    };
  }
}
