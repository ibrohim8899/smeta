import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { FinanceLedgerEntity } from "./finance-ledger.entity";

@Entity("finance_payments")
export class FinancePaymentEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => FinanceLedgerEntity, {
    onDelete: "CASCADE"
  })
  ledger!: FinanceLedgerEntity;

  @Column({ name: "amount_uzs", type: "integer" })
  amountUzs!: number;

  @Column({ nullable: true, type: "text" })
  note!: string | null;

  @Column({ nullable: true, type: "varchar" })
  method!: string | null;

  @Column({ nullable: true, type: "varchar" })
  reference!: string | null;

  @Column({ name: "proof_file_name", nullable: true, type: "varchar" })
  proofFileName!: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
