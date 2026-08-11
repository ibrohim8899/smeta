import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("notification_outbox")
export class NotificationOutboxEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ default: "web" })
  channel!: string;

  @Column({ name: "recipient_role" })
  recipientRole!: string;

  @Column({ name: "recipient_ref", nullable: true, type: "varchar" })
  recipientRef!: string | null;

  @Column({ name: "event_type" })
  eventType!: string;

  @Column({ name: "title_uz" })
  titleUz!: string;

  @Column({ name: "body_uz", type: "text" })
  bodyUz!: string;

  @Column({ default: "pending" })
  status!: string;

  @Column({ default: 0 })
  attempts!: number;

  @Column({ name: "last_error", nullable: true, type: "text" })
  lastError!: string | null;

  @Column({ nullable: true, type: "jsonb" })
  metadata!: Record<string, unknown> | null;

  @Column({ name: "scheduled_at", nullable: true, type: "timestamptz" })
  scheduledAt!: Date | null;

  @Column({ name: "sent_at", nullable: true, type: "timestamptz" })
  sentAt!: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
