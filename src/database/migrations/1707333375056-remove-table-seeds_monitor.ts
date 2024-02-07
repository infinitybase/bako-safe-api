import { MigrationInterface, QueryRunner } from 'typeorm';

export class removeTableSeedsMonitor1707333375056 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('seeds_monitor');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }
}
