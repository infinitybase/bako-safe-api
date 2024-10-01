import { MigrationInterface, QueryRunner, Table, TableColumn } from 'typeorm';

export class DropPredicateNetworkColumns1727651412931
  implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('predicates', 'provider');
    await queryRunner.dropColumn('predicates', 'chainId');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'predicates',
      new TableColumn({
        name: 'provider',
        type: 'varchar',
        isNullable: true,
      }),
    );
    await queryRunner.addColumn(
      'predicates',
      new TableColumn({
        name: 'chain_id',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }
}
