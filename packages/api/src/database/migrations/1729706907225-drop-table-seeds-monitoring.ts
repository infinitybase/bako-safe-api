import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropTableSeedsMonitoring1729706907225 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE seeds_monitor CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // not applicable
  }
}
