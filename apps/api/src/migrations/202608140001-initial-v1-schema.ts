import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialV1Schema2026081400010 implements MigrationInterface {
  name = "InitialV1Schema2026081400010";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "email" varchar UNIQUE,
        "password_hash" varchar,
        "display_name" varchar NOT NULL,
        "role" varchar NOT NULL DEFAULT 'superadmin',
        "roles" text NOT NULL DEFAULT 'superadmin',
        "status" varchar NOT NULL DEFAULT 'active',
        "active" boolean NOT NULL DEFAULT true,
        "telegram_user_id" varchar UNIQUE,
        "telegram_username" varchar,
        "last_login_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dealers" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "display_name" varchar NOT NULL,
        "phone" varchar,
        "region" varchar NOT NULL,
        "company_name" varchar,
        "telegram_user_id" varchar,
        "referral_code" varchar NOT NULL UNIQUE,
        "admin_note" text,
        "status" varchar NOT NULL DEFAULT 'pending',
        "referral_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stores" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL,
        "owner_name" varchar,
        "phone" varchar,
        "address" varchar,
        "telegram_user_id" varchar,
        "service_regions" text NOT NULL,
        "categories" text NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "status" varchar NOT NULL DEFAULT 'approved',
        "admin_note" text,
        "verified_at" timestamptz,
        "commission_rate" double precision NOT NULL DEFAULT 0.05,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "material_requests" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "public_code" varchar NOT NULL UNIQUE,
        "customer_name" varchar NOT NULL,
        "phone" varchar,
        "region" varchar NOT NULL,
        "category" varchar NOT NULL,
        "description" text,
        "delivery_note" text,
        "dealer_referral" varchar,
        "dealer_referral_code" varchar,
        "dealerId" uuid REFERENCES "dealers"("id") ON DELETE SET NULL,
        "source" varchar NOT NULL DEFAULT 'guest_link',
        "status" varchar NOT NULL DEFAULT 'submitted',
        "admin_note" text,
        "guest_token_hash" varchar UNIQUE,
        "guest_token_expires_at" timestamptz,
        "guest_token_revoked_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "request_attachments" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "file_name" varchar NOT NULL,
        "mime_type" varchar NOT NULL,
        "size_bytes" integer NOT NULL,
        "storage_key" varchar,
        "storage_provider" varchar NOT NULL DEFAULT 'local_private',
        "scan_status" varchar NOT NULL DEFAULT 'pending',
        "access_level" varchar NOT NULL DEFAULT 'private',
        "requestId" uuid REFERENCES "material_requests"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "request_recipients" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "requestId" uuid REFERENCES "material_requests"("id") ON DELETE CASCADE,
        "storeId" uuid REFERENCES "stores"("id") ON DELETE CASCADE,
        "status" varchar NOT NULL DEFAULT 'assigned',
        "assigned_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "store_offers" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "requestId" uuid REFERENCES "material_requests"("id") ON DELETE CASCADE,
        "storeId" uuid REFERENCES "stores"("id") ON DELETE CASCADE,
        "material_subtotal_uzs" integer NOT NULL DEFAULT 0,
        "delivery_fee_uzs" integer NOT NULL DEFAULT 0,
        "total_amount_uzs" integer NOT NULL,
        "complete_list_available" boolean NOT NULL DEFAULT true,
        "delivery_estimate" varchar,
        "delivery_included" boolean NOT NULL DEFAULT false,
        "validity_hours" integer NOT NULL DEFAULT 48,
        "note" text,
        "status" varchar NOT NULL DEFAULT 'submitted',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "orders" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "public_code" varchar NOT NULL UNIQUE,
        "requestId" uuid REFERENCES "material_requests"("id") ON DELETE CASCADE,
        "selectedOfferId" uuid REFERENCES "store_offers"("id") ON DELETE CASCADE,
        "storeId" uuid REFERENCES "stores"("id") ON DELETE CASCADE,
        "accepted_amount_uzs" integer NOT NULL,
        "final_amount_uzs" integer,
        "status" varchar NOT NULL DEFAULT 'pending_store_acceptance',
        "status_note" text,
        "delivery_proof_note" text,
        "delivery_proof_file_name" varchar,
        "delivered_at" timestamptz,
        "confirmed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "finance_ledger" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "public_code" varchar NOT NULL UNIQUE,
        "orderId" uuid REFERENCES "orders"("id") ON DELETE CASCADE,
        "base_amount_uzs" integer NOT NULL,
        "store_commission_rate_bps" integer NOT NULL,
        "dealer_reward_rate_bps" integer NOT NULL,
        "platform_commission_uzs" integer NOT NULL,
        "dealer_reward_uzs" integer NOT NULL,
        "platform_net_uzs" integer NOT NULL,
        "store_debt_uzs" integer NOT NULL,
        "paid_amount_uzs" integer NOT NULL DEFAULT 0,
        "status" varchar NOT NULL DEFAULT 'payable',
        "due_at" timestamptz,
        "dealer_referral" varchar,
        "dealer_id" uuid,
        "payment_note" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "finance_payments" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "ledgerId" uuid REFERENCES "finance_ledger"("id") ON DELETE CASCADE,
        "amount_uzs" integer NOT NULL,
        "note" text,
        "method" varchar,
        "reference" varchar,
        "proof_file_name" varchar,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "finance_adjustments" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "ledgerId" uuid REFERENCES "finance_ledger"("id") ON DELETE CASCADE,
        "amount_uzs" integer NOT NULL,
        "type" varchar NOT NULL DEFAULT 'adjustment',
        "reason" text,
        "proof_file_name" varchar,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "finance_payouts" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "public_code" varchar NOT NULL UNIQUE,
        "dealer_id" uuid NOT NULL,
        "dealer_name" varchar,
        "amount_uzs" integer NOT NULL,
        "status" varchar NOT NULL DEFAULT 'approved',
        "method" varchar,
        "reference" varchar,
        "proof_file_name" varchar,
        "note" text,
        "paid_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_outbox" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "channel" varchar NOT NULL DEFAULT 'web',
        "recipient_role" varchar NOT NULL,
        "recipient_ref" varchar,
        "event_type" varchar NOT NULL,
        "title_uz" varchar NOT NULL,
        "body_uz" text NOT NULL,
        "status" varchar NOT NULL DEFAULT 'pending',
        "attempts" integer NOT NULL DEFAULT 0,
        "last_error" text,
        "metadata" jsonb,
        "scheduled_at" timestamptz,
        "sent_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "actor_id" varchar,
        "actor_role" varchar,
        "action" varchar NOT NULL,
        "entity_type" varchar NOT NULL,
        "entity_id" varchar,
        "reason" text,
        "metadata" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "auth_sessions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash" varchar NOT NULL UNIQUE,
        "role" varchar NOT NULL,
        "source" varchar NOT NULL DEFAULT 'telegram_init_data',
        "expires_at" timestamptz NOT NULL,
        "revoked_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "auth_login_nonces" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "nonce_hash" varchar NOT NULL UNIQUE,
        "requested_role" varchar,
        "status" varchar NOT NULL DEFAULT 'pending',
        "confirmedUserId" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "confirmed_role" varchar,
        "expires_at" timestamptz NOT NULL,
        "confirmed_at" timestamptz,
        "consumed_at" timestamptz,
        "canceled_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "telegram_updates" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "update_id" bigint NOT NULL UNIQUE,
        "status" varchar NOT NULL DEFAULT 'processed',
        "event_type" varchar,
        "error" text,
        "payload" jsonb NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "telegram_application_drafts" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "telegram_user_id" varchar NOT NULL,
        "kind" varchar NOT NULL,
        "step" varchar NOT NULL,
        "status" varchar NOT NULL DEFAULT 'active',
        "data" jsonb NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_telegram_application_drafts_active" ON "telegram_application_drafts" ("telegram_user_id", "status", "updated_at")`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "app_settings" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "key" varchar NOT NULL UNIQUE,
        "value" jsonb NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_material_requests_status_updated" ON "material_requests" ("status", "updated_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_orders_status_created" ON "orders" ("status", "created_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_notifications_due" ON "notification_outbox" ("status", "channel", "scheduled_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_finance_ledger_status_due" ON "finance_ledger" ("status", "due_at")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "app_settings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "telegram_application_drafts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "telegram_updates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "auth_login_nonces"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "auth_sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_outbox"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "finance_payouts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "finance_adjustments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "finance_payments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "finance_ledger"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "orders"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "store_offers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "request_recipients"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "request_attachments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "material_requests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stores"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "dealers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
