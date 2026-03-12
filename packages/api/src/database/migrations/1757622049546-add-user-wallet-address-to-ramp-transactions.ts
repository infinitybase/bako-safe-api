import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUserWalletAddressToRampTransactions1757622049546
  implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'ramp_transactions',
      new TableColumn({
        name: 'user_wallet_address',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('ramp_transactions', 'user_wallet_address');
  }
}
