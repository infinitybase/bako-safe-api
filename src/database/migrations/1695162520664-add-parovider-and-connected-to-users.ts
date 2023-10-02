import { MigrationInterface, QueryRunner, Table, TableColumn } from 'typeorm';

export class addParoviderAndConnectedToUsers1695162520664
  implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('users', [
      new TableColumn({
        name: 'address',
        type: 'varchar',
      }),
      new TableColumn({
        name: 'provider',
        type: 'varchar',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('users', ['connected_users', 'provider']);
  }
}
