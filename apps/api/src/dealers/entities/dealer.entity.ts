import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("dealers")
export class DealerEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "display_name" })
  displayName!: string;

  @Column({ nullable: true, type: "varchar" })
  phone!: string | null;

  @Column()
  region!: string;

  @Column({ name: "company_name", nullable: true, type: "varchar" })
  companyName!: string | null;

  @Column({ name: "referral_code", unique: true })
  referralCode!: string;

  @Column({ name: "admin_note", nullable: true, type: "text" })
  adminNote!: string | null;

  @Column({ default: "pending" })
  status!: string;

  @Column({ default: true, name: "referral_active" })
  referralActive!: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
