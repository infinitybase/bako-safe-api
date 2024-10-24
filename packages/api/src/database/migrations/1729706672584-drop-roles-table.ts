import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropRolesTable1729706672584 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE roles CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // not applicable
  }
}
