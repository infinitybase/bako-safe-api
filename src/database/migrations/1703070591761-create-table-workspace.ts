import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class createTableWorkspace1703070591761 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'workspace',
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
            name: 'name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'avatar',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'owner_id',
            type: 'uuid',
            isNullable: false,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['owner_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'CASCADE',
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('workspace');
  }
}
