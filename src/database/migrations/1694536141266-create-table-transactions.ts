import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class createTableTransactions1694536141266 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'transactions',
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
            name: 'predicateAdress',
            type: 'varchar',
          },
          {
            name: 'predicateID',
            type: 'integer',
          },
          {
            name: 'name',
            type: 'varchar',
          },
          {
            name: 'txData',
            type: 'varchar',
          },
          {
            name: 'hash',
            type: 'varchar',
          },
          {
            name: 'status',
            type: 'varchar',
          },
          {
            name: 'sendTime',
            type: 'varchar',
          },
          {
            name: 'gasUsed',
            type: 'varchar',
          },
          {
            name: 'resume',
            type: 'text',
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
            name: 'FK-predicate-transactions',
            columnNames: ['predicateID'],
            referencedColumnNames: ['id'],
            referencedTableName: 'predicates',
            onDelete: 'CASCADE',
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('transactions');
  }
}
