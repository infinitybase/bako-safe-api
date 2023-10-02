import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class addCollumnsToUsertoken1695163991051 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('user_tokens', [
      new TableColumn({
        name: 'expired_at',
        type: 'timestamp',
        isNullable: true,
      }),
      new TableColumn({
        name: 'encoder',
        type: 'varchar',
      }),
      new TableColumn({
        name: 'provider',
        type: 'varchar',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('user_tokens', [
      'expired_at',
      'encoder',
      'provider',
    ]);
  }
}
