import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class addNotificationsColumnsToUsersTable1702391257625
  implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('users', [
      new TableColumn({
        name: 'first_login',
        type: 'boolean',
        default: true,
      }),
      new TableColumn({
        name: 'notify',
        type: 'boolean',
        default: false,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('users', ['first_login', 'notify']);
  }
}
