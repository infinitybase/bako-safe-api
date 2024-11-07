import { MigrationInterface, QueryRunner } from 'typeorm';

const { DATABASE_NAME, DB_METABASE_USERNAME, DB_METABASE_PASS } = process.env;

export class AddMetabaseDbUser1730994094877 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE USER '${DB_METABASE_USERNAME}'@'host' IDENTIFIED BY '${DB_METABASE_PASS}';`,
    );

    await queryRunner.query(
      `GRANT SELECT ON ${DATABASE_NAME}.* TO '${DB_METABASE_USERNAME}'@'host';`,
    );

    await queryRunner.query(`FLUSH PRIVILEGES;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
