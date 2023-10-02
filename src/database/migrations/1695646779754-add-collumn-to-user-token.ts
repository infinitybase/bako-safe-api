import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class addCollumnToUserToken1695646779754 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('user_tokens', [
      new TableColumn({
        name: 'payload',
        type: 'text',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('user_tokens', ['payload']);
  }
}
