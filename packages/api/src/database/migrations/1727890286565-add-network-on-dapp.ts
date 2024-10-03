import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddNetworkOnDapp1727890286565 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'dapp',
      new TableColumn({
        name: 'network',
        type: 'jsonb',
        isNullable: true,
      }),
    );

    await queryRunner.query(`DELETE FROM dapp WHERE network IS NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('dapp', 'network');
  }
}
