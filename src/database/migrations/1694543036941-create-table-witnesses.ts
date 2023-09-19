import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class createTableWitnesses1694543036941 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'witnesses',
        columns: [
          {
            name: 'id',
            type: 'integer',
            unsigned: true,
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'signature',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'account',
            type: 'varchar',
          },
          {
            name: 'transactionID',
            type: 'uuid',
          },
          {
            name: 'created_at',
            type: 'timestamp',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            name: 'FK-transaction-witnesses',
            columnNames: ['transactionID'],
            referencedColumnNames: ['id'],
            referencedTableName: 'transactions',
            onDelete: 'CASCADE',
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('witnesses');
  }
}
