import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("stores")
export class StoreEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  name!: string;

  @Column({ name: "owner_name", nullable: true, type: "varchar" })
  ownerName!: string | null;

  @Column({ nullable: true, type: "varchar" })
  phone!: string | null;

  @Column({ nullable: true, type: "varchar" })
  address!: string | null;

  @Column({ name: "telegram_user_id", nullable: true, type: "varchar" })
  telegramUserId!: string | null;

  @Column({ name: "service_regions", type: "simple-array" })
  serviceRegions!: string[];

  @Column({ type: "simple-array" })
  categories!: string[];

  @Column({ default: true })
  active!: boolean;

  @Column({ default: "approved" })
  status!: string;

  @Column({ name: "admin_note", nullable: true, type: "text" })
  adminNote!: string | null;

  @Column({ name: "verified_at", nullable: true, type: "timestamptz" })
  verifiedAt!: Date | null;

  @Column({ default: 0.05, name: "commission_rate", type: "double precision" })
  commissionRate!: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
