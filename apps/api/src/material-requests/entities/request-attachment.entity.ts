import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { MaterialRequestEntity } from "./material-request.entity";

@Entity("request_attachments")
export class RequestAttachmentEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "file_name" })
  fileName!: string;

  @Column({ name: "mime_type" })
  mimeType!: string;

  @Column({ name: "size_bytes", type: "integer" })
  sizeBytes!: number;

  @Column({ name: "storage_key", nullable: true, type: "varchar" })
  storageKey!: string | null;

  @Column({ name: "storage_provider", default: "local_private" })
  storageProvider!: string;

  @Column({ name: "scan_status", default: "pending" })
  scanStatus!: string;

  @Column({ name: "access_level", default: "private" })
  accessLevel!: string;

  @ManyToOne(() => MaterialRequestEntity, (request) => request.attachments, {
    onDelete: "CASCADE"
  })
  request!: MaterialRequestEntity;
}
