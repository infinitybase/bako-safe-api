import { TransactionStatus, TransactionType } from 'bakosafe';
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateTableDepositTransactions1744248043108 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.createTable(
        new Table({
          name: 'deposit_transactions',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              isUnique: true,
              generationStrategy: 'uuid',
              default: `uuid_generate_v4()`,
            },
            {
              name: 'predicate_reference_id',
              type: 'uuid',
            },
            {
              name: 'predicate_id',
              type: 'varchar',
            },
            {
              name: 'hash',
              type: 'varchar',
              isUnique: true,
            },
            {
              name: 'type',
              type: 'enum',
              enum: Object.values(TransactionType) as string[],
              default: `'${TransactionType.TRANSACTION_SCRIPT}'`,
            },
            {
              name: 'status',
              type: 'enum',
              enum: Object.values(TransactionStatus) as string[],
              default: `'${TransactionStatus.AWAIT_REQUIREMENTS}'`,
            },
            {
              name: 'summary',
              type: 'jsonb',
            },
            {
              name: 'send_time',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'network',
              type: 'jsonb',
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
              columnNames: ['predicate_reference_id'],
              referencedColumnNames: ['id'],
              referencedTableName: 'predicates',
              onDelete: 'CASCADE',
            },
          ],
        })
      );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('deposit_transactions');
    }

}
