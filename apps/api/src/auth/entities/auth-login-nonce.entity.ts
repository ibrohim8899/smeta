import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { UserEntity } from "../../users/entities/user.entity";

@Entity("auth_login_nonces")
export class AuthLoginNonceEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "nonce_hash", unique: true })
  nonceHash!: string;

  @Column({ name: "requested_role", nullable: true, type: "varchar" })
  requestedRole!: string | null;

  @Column({ default: "pending" })
  status!: string;

  @ManyToOne(() => UserEntity, {
    eager: true,
    nullable: true,
    onDelete: "SET NULL"
  })
  confirmedUser!: UserEntity | null;

  @Column({ name: "confirmed_role", nullable: true, type: "varchar" })
  confirmedRole!: string | null;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt!: Date;

  @Column({ name: "confirmed_at", nullable: true, type: "timestamptz" })
  confirmedAt!: Date | null;

  @Column({ name: "consumed_at", nullable: true, type: "timestamptz" })
  consumedAt!: Date | null;

  @Column({ name: "canceled_at", nullable: true, type: "timestamptz" })
  canceledAt!: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
