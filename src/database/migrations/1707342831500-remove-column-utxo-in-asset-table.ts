import { TableColumn, MigrationInterface, QueryRunner } from 'typeorm';

export class removeColumnUtxoInAssetTable1707342831500
  implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('assets', 'utxo');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'assets',
      new TableColumn({
        name: 'utxo',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }
}
