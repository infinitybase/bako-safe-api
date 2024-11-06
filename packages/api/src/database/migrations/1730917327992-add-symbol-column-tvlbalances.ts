import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSymbolColumnTvlbalances1730917327992 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'tvl_balances',
      new TableColumn({
        name: 'symbol',
        type: 'varchar',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('tvl_balances', 'symbol');
  }
}
