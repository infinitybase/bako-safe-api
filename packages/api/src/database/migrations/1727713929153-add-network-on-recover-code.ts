import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddNetworkOnRecoverCode1727713929153 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'recover_codes',
      new TableColumn({
        name: 'network',
        type: 'jsonb',
        isNullable: true,
      }),
    );

    await queryRunner.query(`DELETE FROM recover_codes WHERE network IS NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('recover_codes', 'network');
  }
}
