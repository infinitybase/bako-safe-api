import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class changeColumnNameOfPredicate1707336840288
  implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('predicates', 'predicateAddress');
    await queryRunner.addColumn(
      'predicates',
      new TableColumn({
        name: 'predicate_address',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('predicates', 'predicate_address');
    await queryRunner.addColumn(
      'predicates',
      new TableColumn({
        name: 'predicateAddress',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }
}
