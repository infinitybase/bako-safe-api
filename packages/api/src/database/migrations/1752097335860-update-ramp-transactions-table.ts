import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class UpdateRampTransactionsTable1752097335860
  implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('ramp_transactions', [
      new TableColumn({
        name: 'source_currency',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'source_amount',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'destination_currency',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'destination_amount',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'payment_method',
        type: 'varchar',
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('ramp_transactions', [
      'source_currency',
      'source_amount',
      'destination_currency',
      'destination_amount',
      'payment_method',
    ]);
  }
}
