import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { OrderEntity } from "../../orders/entities/order.entity";

@Entity("finance_ledger")
export class FinanceLedgerEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "public_code", unique: true })
  publicCode!: string;

  @ManyToOne(() => OrderEntity, {
    eager: true,
    onDelete: "CASCADE"
  })
  order!: OrderEntity;

  @Column({ name: "base_amount_uzs", type: "integer" })
  baseAmountUzs!: number;

  @Column({ name: "store_commission_rate_bps", type: "integer" })
  storeCommissionRateBps!: number;

  @Column({ name: "dealer_reward_rate_bps", type: "integer" })
  dealerRewardRateBps!: number;

  @Column({ name: "platform_commission_uzs", type: "integer" })
  platformCommissionUzs!: number;

  @Column({ name: "dealer_reward_uzs", type: "integer" })
  dealerRewardUzs!: number;

  @Column({ name: "platform_net_uzs", type: "integer" })
  platformNetUzs!: number;

  @Column({ name: "store_debt_uzs", type: "integer" })
  storeDebtUzs!: number;

  @Column({ default: 0, name: "paid_amount_uzs", type: "integer" })
  paidAmountUzs!: number;

  @Column({ default: "payable" })
  status!: string;

  @Column({ name: "dealer_referral", nullable: true, type: "varchar" })
  dealerReferral!: string | null;

  @Column({ name: "payment_note", nullable: true, type: "text" })
  paymentNote!: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
