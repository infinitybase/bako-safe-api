import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class DropColumnMinsignersOnPredicate1727726982707
  implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('predicates', 'minSigners');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'predicates',
      new TableColumn({
        name: 'minSigners',
        type: 'int',
        isNullable: true,
      }),
    );
  }
}
