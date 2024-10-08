import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddNetworkToNotifications1728332400808 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'notifications',
      new TableColumn({
        name: 'network',
        type: 'jsonb',
        isNullable: true,
      }),
    );

    await queryRunner.query(`DELETE FROM notifications WHERE network IS NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('notifications', 'network');
  }
}
