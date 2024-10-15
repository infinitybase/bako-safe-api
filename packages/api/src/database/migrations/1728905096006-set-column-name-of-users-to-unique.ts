import { MigrationInterface, QueryRunner, TableUnique } from 'typeorm';

export class SetColumnNameOfUsersToUnique1728905096006
  implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createUniqueConstraint(
      'users',
      new TableUnique({
        columnNames: ['name'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropUniqueConstraint('users', 'name');
  }
}
