import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddNetworkOnApiTokens1727717621119 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'api_tokens',
      new TableColumn({
        name: 'network',
        type: 'jsonb',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('api_tokens', 'network');
  }
}
