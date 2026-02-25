import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1764104869733 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Índices para acelerar queries de predicates por usuário
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_predicate_members_user" ON "predicate_members" ("user_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_predicates_owner" ON "predicates" ("owner_id")`,
    );

    // Índices para acelerar queries de transactions
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_transactions_predicate_status" ON "transactions" ("predicate_id", "status")`,
    );

    // Índice para filtrar transactions por network URL (JSONB)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_transactions_network_url" ON "transactions" ((network->>'url'))`,
    );

    console.log('Performance indexes created successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índices na ordem inversa
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_transactions_network_url"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_transactions_predicate_status"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_predicates_owner"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_predicate_members_user"`);

    console.log('Performance indexes dropped successfully');
  }
}
