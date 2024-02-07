import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class changeColumnNameOfPredicate1707336840288
  implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('predicates', 'predicateAddress');
    await queryRunner.dropColumn('predicates', 'minSigners');
    await queryRunner.dropColumn('predicates', 'chainId');
    await queryRunner.addColumn(
      'predicates',
      new TableColumn({
        name: 'predicate_address',
        type: 'varchar',
        isNullable: true,
      }),
    );
    await queryRunner.addColumn(
      'predicates',
      new TableColumn({
        name: 'min_signers',
        type: 'integer',
        isNullable: true,
      }),
    );
    await queryRunner.addColumn(
      'predicates',
      new TableColumn({
        name: 'chain_id',
        type: 'integer',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('predicates', 'predicate_address');
    await queryRunner.dropColumn('predicates', 'min_signers');
    await queryRunner.dropColumn('predicates', 'chain_id');
    await queryRunner.addColumn(
      'predicates',
      new TableColumn({
        name: 'predicateAddress',
        type: 'varchar',
        isNullable: true,
      }),
    );
    await queryRunner.addColumn(
      'predicates',
      new TableColumn({
        name: 'minSigners',
        type: 'integer',
        isNullable: true,
      }),
    );
    await queryRunner.addColumn(
      'predicates',
      new TableColumn({
        name: 'chainId',
        type: 'integer',
        isNullable: true,
      }),
    );
  }
}
