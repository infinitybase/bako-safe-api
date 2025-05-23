import { DEFAULT_PREDICATE_VERSION } from 'bakosafe';
import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

const column = new TableColumn({
  name: 'version',
  type: 'varchar',
  isNullable: false,
  default: `'${DEFAULT_PREDICATE_VERSION}'`,
});

export class AddColumnVersionOnPredicates1729778299009
  implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('predicates', column);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('predicates', 'version');
  }
}
