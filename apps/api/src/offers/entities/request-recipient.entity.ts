import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { MaterialRequestEntity } from "../../material-requests/entities/material-request.entity";
import { StoreEntity } from "../../stores/entities/store.entity";

@Entity("request_recipients")
export class RequestRecipientEntity {
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

  @Column({ default: "assigned" })
  status!: string;

  @CreateDateColumn({ name: "assigned_at" })
  assignedAt!: Date;
}
