import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { DealerEntity } from "../../dealers/entities/dealer.entity";
import { RequestAttachmentEntity } from "./request-attachment.entity";

@Entity("material_requests")
export class MaterialRequestEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "public_code", unique: true })
  publicCode!: string;

  @Column({ name: "customer_name" })
  customerName!: string;

  @Column({ nullable: true, type: "varchar" })
  phone!: string | null;

  @Column()
  region!: string;

  @Column()
  category!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ name: "dealer_referral", nullable: true, type: "varchar" })
  dealerReferral!: string | null;

  @Column({ name: "dealer_referral_code", nullable: true, type: "varchar" })
  dealerReferralCode!: string | null;

  @ManyToOne(() => DealerEntity, {
    nullable: true,
    onDelete: "SET NULL"
  })
  dealer!: DealerEntity | null;

  @Column({ default: "guest_link" })
  source!: string;

  @Column({ default: "submitted" })
  status!: string;

  @Column({ name: "admin_note", nullable: true, type: "text" })
  adminNote!: string | null;

  @OneToMany(() => RequestAttachmentEntity, (attachment) => attachment.request, {
    cascade: true
  })
  attachments!: RequestAttachmentEntity[];

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
