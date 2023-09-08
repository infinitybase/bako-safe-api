import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class createTablePredicates1694193586666 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'predicates',
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
            name: 'name',
            type: 'varchar',
          },
          {
            name: 'address',
            type: 'varchar',
          },
          {
            name: 'description',
            type: 'varchar',
          },
          {
            name: 'minSigners',
            type: 'integer',
          },
          {
            name: 'addresses',
            type: 'text',
          },
          {
            name: 'owner',
            type: 'varchar',
          },
          {
            name: 'bytes',
            type: 'varchar',
          },
          {
            name: 'abi',
            type: 'varchar',
          },
          {
            name: 'configurable',
            type: 'varchar',
          },
          {
            name: 'network',
            type: 'varchar',
          },
          {
            name: 'chainId',
            type: 'integer',
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
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('predicates');
  }
}
