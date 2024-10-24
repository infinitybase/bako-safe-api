import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropVaultTemplateTables1729705458381 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE vault_template CASCADE`);
    await queryRunner.query(`DROP TABLE vault_template_members CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // not applicable
  }
}
