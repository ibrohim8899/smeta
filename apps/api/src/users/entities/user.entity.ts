import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("users")
export class UserEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ name: "password_hash" })
  passwordHash!: string;

  @Column({ name: "display_name" })
  displayName!: string;

  @Column({ default: "superadmin" })
  role!: string;

  @Column({ default: "active" })
  status!: string;

  @Column({ default: true })
  active!: boolean;

  @Column({ name: "telegram_user_id", nullable: true, type: "varchar", unique: true })
  telegramUserId!: string | null;

  @Column({ name: "telegram_username", nullable: true, type: "varchar" })
  telegramUsername!: string | null;

  @Column({ name: "last_login_at", nullable: true, type: "timestamptz" })
  lastLoginAt!: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
