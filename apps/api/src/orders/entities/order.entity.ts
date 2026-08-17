import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { MaterialRequestEntity } from "../../material-requests/entities/material-request.entity";
import { StoreOfferEntity } from "../../offers/entities/store-offer.entity";
import { StoreEntity } from "../../stores/entities/store.entity";

@Entity("orders")
export class OrderEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "public_code", unique: true })
  publicCode!: string;

  @ManyToOne(() => MaterialRequestEntity, {
    eager: true,
    onDelete: "CASCADE"
  })
  request!: MaterialRequestEntity;

  @ManyToOne(() => StoreOfferEntity, {
    eager: true,
    onDelete: "CASCADE"
  })
  selectedOffer!: StoreOfferEntity;

  @ManyToOne(() => StoreEntity, {
    eager: true,
    onDelete: "CASCADE"
  })
  store!: StoreEntity;

  @Column({ name: "accepted_amount_uzs", type: "integer" })
  acceptedAmountUzs!: number;

  @Column({ name: "final_amount_uzs", nullable: true, type: "integer" })
  finalAmountUzs!: number | null;

  @Column({ default: "pending_store_acceptance" })
  status!: string;

  @Column({ name: "status_note", nullable: true, type: "text" })
  statusNote!: string | null;

  @Column({ name: "delivery_proof_note", nullable: true, type: "text" })
  deliveryProofNote!: string | null;

  @Column({ name: "delivery_proof_file_name", nullable: true, type: "varchar" })
  deliveryProofFileName!: string | null;

  @Column({ name: "delivered_at", nullable: true, type: "timestamptz" })
  deliveredAt!: Date | null;

  @Column({ name: "confirmed_at", nullable: true, type: "timestamptz" })
  confirmedAt!: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
