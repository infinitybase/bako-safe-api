import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class ChangeCreatedAtTvlbalances1730913112653 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumn(
      'tvl_balances',
      'created_at',
      new TableColumn({
        name: 'created_at',
        type: 'date',
      }),
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_predicate_id_asset_id_created_at" ON "public"."tvl_balances" ("predicate_id" ASC, "asset_id" ASC, "created_at" ASC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_predicate_id_asset_id_created_at"`,
    );
    await queryRunner.dropColumn('tvl_balances', 'created_at');
    await queryRunner.changeColumn(
      'tvl_balances',
      'created_at',
      new TableColumn({
        name: 'created_at',
        type: 'timestamp',
      }),
    );
  }
}
