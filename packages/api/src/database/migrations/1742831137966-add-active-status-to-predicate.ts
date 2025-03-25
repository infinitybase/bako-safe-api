import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActiveStatusToPredicate1742831137966 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE predicates
      ADD COLUMN active boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      CREATE INDEX idx_predicates_active ON predicates(active)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX idx_predicates_active
    `);

    await queryRunner.query(`
      ALTER TABLE predicates
      DROP COLUMN active
    `);
  }
}
