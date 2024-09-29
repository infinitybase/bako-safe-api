import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddNetworkOnUserToken1727369170956 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'user_tokens',
      new TableColumn({
        name: 'network',
        type: 'jsonb',
        isNullable: true,
      }),
    );

    await queryRunner.dropColumn('user_tokens', 'provider');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('user_tokens', 'network');
    await queryRunner.addColumn(
      'user_tokens',
      new TableColumn({
        name: 'provider',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }
}
