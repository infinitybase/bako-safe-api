import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddHandleInfosColumnToAdb1732301542890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'address_book',
      new TableColumn({
        name: 'handle_info',
        type: 'jsonb',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('address_book', 'handle_info');
  }
}
