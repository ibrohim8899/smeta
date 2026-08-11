import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("stores")
export class StoreEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true, type: "varchar" })
  phone!: string | null;

  @Column({ name: "service_regions", type: "simple-array" })
  serviceRegions!: string[];

  @Column({ type: "simple-array" })
  categories!: string[];

  @Column({ default: true })
  active!: boolean;

  @Column({ default: 0.05, name: "commission_rate", type: "double precision" })
  commissionRate!: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
