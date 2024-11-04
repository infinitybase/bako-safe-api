import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateTvlbalancesTable1730740606890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'tvl_balances',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isUnique: true,
            generationStrategy: 'uuid',
            default: `uuid_generate_v4()`,
          },
          {
            name: 'predicate_id',
            type: 'uuid',
          },
          {
            name: 'asset_id',
            type: 'varchar',
          },
          { name: 'usd_price', type: 'varchar' },
          { name: 'usd_amount', type: 'varchar' },
          { name: 'amount', type: 'varchar' },
          {
            name: 'created_at',
            type: 'timestamp',
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE tvl_balances CASCADE`);
  }
}
