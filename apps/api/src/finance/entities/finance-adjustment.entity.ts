import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { FinanceLedgerEntity } from "./finance-ledger.entity";

@Entity("finance_adjustments")
export class FinanceAdjustmentEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => FinanceLedgerEntity, {
    onDelete: "CASCADE"
  })
  ledger!: FinanceLedgerEntity;

  @Column({ name: "amount_uzs", type: "integer" })
  amountUzs!: number;

  @Column({ default: "adjustment" })
  type!: string;

  @Column({ nullable: true, type: "text" })
  reason!: string | null;

  @Column({ name: "proof_file_name", nullable: true, type: "varchar" })
  proofFileName!: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
