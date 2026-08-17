import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { UserEntity } from "../../users/entities/user.entity";

@Entity("auth_sessions")
export class AuthSessionEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => UserEntity, {
    eager: true,
    onDelete: "CASCADE"
  })
  user!: UserEntity;

  @Column({ name: "token_hash", unique: true })
  tokenHash!: string;

  @Column()
  role!: string;

  @Column({ default: "telegram_init_data" })
  source!: string;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt!: Date;

  @Column({ name: "revoked_at", nullable: true, type: "timestamptz" })
  revokedAt!: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
