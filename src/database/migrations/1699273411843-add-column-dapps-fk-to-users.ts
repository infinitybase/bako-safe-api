import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class addColumnDappsFkToUsers1699273411843 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'apps_connected',
        columns: [
          {
            name: 'dapp_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
        ],
        foreignKeys: [
          {
            name: 'FK-user-apps_connected',
            columnNames: ['user_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'CASCADE',
          },
          {
            name: 'FK-dapp-apps_connected',
            columnNames: ['dapp_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'dapp',
            onDelete: 'CASCADE',
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('apps_connected');
  }
}
