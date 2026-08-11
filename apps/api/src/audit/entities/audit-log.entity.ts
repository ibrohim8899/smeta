import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("audit_logs")
export class AuditLogEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "actor_id", nullable: true, type: "varchar" })
  actorId!: string | null;

  @Column({ name: "actor_role", nullable: true, type: "varchar" })
  actorRole!: string | null;

  @Column()
  action!: string;

  @Column({ name: "entity_type" })
  entityType!: string;

  @Column({ name: "entity_id", nullable: true, type: "varchar" })
  entityId!: string | null;

  @Column({ nullable: true, type: "text" })
  reason!: string | null;

  @Column({ nullable: true, type: "jsonb" })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
