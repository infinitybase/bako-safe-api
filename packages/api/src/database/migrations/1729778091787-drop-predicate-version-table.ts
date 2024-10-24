import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropPredicateVersionTable1729778091787 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey(
      'predicates',
      'FK-predicate-predicate_version',
    );
    await queryRunner.dropColumn('predicates', 'version_id');
    await queryRunner.dropTable('predicate_versions');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // not applicable
  }
}
