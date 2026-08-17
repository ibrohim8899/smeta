import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("finance_payouts")
export class FinancePayoutEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "public_code", unique: true })
  publicCode!: string;

  @Column({ name: "dealer_id", type: "uuid" })
  dealerId!: string;

  @Column({ name: "dealer_name", nullable: true, type: "varchar" })
  dealerName!: string | null;

  @Column({ name: "amount_uzs", type: "integer" })
  amountUzs!: number;

  @Column({ default: "approved" })
  status!: string;

  @Column({ nullable: true, type: "varchar" })
  method!: string | null;

  @Column({ nullable: true, type: "varchar" })
  reference!: string | null;

  @Column({ name: "proof_file_name", nullable: true, type: "varchar" })
  proofFileName!: string | null;

  @Column({ nullable: true, type: "text" })
  note!: string | null;

  @Column({ name: "paid_at", nullable: true, type: "timestamptz" })
  paidAt!: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
