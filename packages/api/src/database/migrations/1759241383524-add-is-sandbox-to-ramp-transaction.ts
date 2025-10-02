import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddIsSandboxToRampTransaction1759241383524
  implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'ramp_transactions',
      new TableColumn({
        name: 'is_sandbox',
        type: 'boolean',
        isNullable: false,
        default: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('ramp_transactions', 'is_sandbox');
  }
}
