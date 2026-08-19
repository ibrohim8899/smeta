import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("telegram_application_drafts")
export class TelegramApplicationDraftEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "telegram_user_id" })
  telegramUserId!: string;

  @Column()
  kind!: "dealer" | "store";

  @Column()
  step!: string;

  @Column({ default: "active" })
  status!: "active" | "completed" | "canceled";

  @Column({ type: "jsonb" })
  data!: Record<string, unknown>;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
