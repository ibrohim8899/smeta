import { MigrationInterface, QueryRunner } from "typeorm";

export class TelegramBotV1202608150001 implements MigrationInterface {
  name = "TelegramBotV1202608150001";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "dealers" ADD COLUMN IF NOT EXISTS "telegram_user_id" varchar`);
    await queryRunner.query(`ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "telegram_user_id" varchar`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_dealers_telegram_user_id" ON "dealers" ("telegram_user_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_stores_telegram_user_id" ON "stores" ("telegram_user_id")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_stores_telegram_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_dealers_telegram_user_id"`);
    await queryRunner.query(`ALTER TABLE "stores" DROP COLUMN IF EXISTS "telegram_user_id"`);
    await queryRunner.query(`ALTER TABLE "dealers" DROP COLUMN IF EXISTS "telegram_user_id"`);
  }
}
