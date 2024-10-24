import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropTvlTable1729707013409 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE total_values_locked CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // not applicable
  }
}
