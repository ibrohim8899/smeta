import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { MaterialRequestEntity } from "../../material-requests/entities/material-request.entity";
import { StoreEntity } from "../../stores/entities/store.entity";

@Entity("store_offers")
export class StoreOfferEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => MaterialRequestEntity, {
    onDelete: "CASCADE"
  })
  request!: MaterialRequestEntity;

  @ManyToOne(() => StoreEntity, {
    eager: true,
    onDelete: "CASCADE"
  })
  store!: StoreEntity;

  @Column({ default: 0, name: "material_subtotal_uzs", type: "integer" })
  materialSubtotalUzs!: number;

  @Column({ default: 0, name: "delivery_fee_uzs", type: "integer" })
  deliveryFeeUzs!: number;

  @Column({ name: "total_amount_uzs", type: "integer" })
  totalAmountUzs!: number;

  @Column({ default: true, name: "complete_list_available" })
  completeListAvailable!: boolean;

  @Column({ name: "delivery_estimate", nullable: true, type: "varchar" })
  deliveryEstimate!: string | null;

  @Column({ default: false, name: "delivery_included" })
  deliveryIncluded!: boolean;

  @Column({ default: 48, name: "validity_hours", type: "integer" })
  validityHours!: number;

  @Column({ nullable: true, type: "text" })
  note!: string | null;

  @Column({ default: "submitted" })
  status!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
