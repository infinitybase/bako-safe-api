import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddColumnSettingsInUser1742836011595 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN settings jsonb NOT NULL DEFAULT '{"inactivesPredicates":[]}'::jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_users_settings
    `);
  }
}
