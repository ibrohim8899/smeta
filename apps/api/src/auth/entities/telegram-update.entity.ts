import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("telegram_updates")
export class TelegramUpdateEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "update_id", type: "bigint", unique: true })
  updateId!: string;

  @Column({ default: "processed" })
  status!: string;

  @Column({ name: "event_type", nullable: true, type: "varchar" })
  eventType!: string | null;

  @Column({ nullable: true, type: "text" })
  error!: string | null;

  @Column({ type: "jsonb" })
  payload!: unknown;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
