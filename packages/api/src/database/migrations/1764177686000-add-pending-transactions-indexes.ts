import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to optimize /transaction/pending endpoint
 *
 * Adds indexes for:
 * - status filtering (partial index for AWAIT_REQUIREMENTS)
 * - chainId lookup (instead of URL regex)
 * - workspace lookup through predicate
 */
export class AddPendingTransactionsIndexes1764177686000
  implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Partial index for pending transactions only
    // This is very efficient because it only indexes rows with this status
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_transactions_pending"
      ON "transactions" ("predicate_id")
      WHERE status = 'await_requirements'
    `);

    // Index for chainId lookup (faster than URL regex)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_transactions_network_chainid"
      ON "transactions" ((network->>'chainId'))
    `);

    // Composite index for workspace queries on predicates
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_predicates_workspace"
      ON "predicates" ("workspace_id")
    `);

    console.log('[Migration] Pending transactions indexes created');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_transactions_pending"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_transactions_network_chainid"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_predicates_workspace"`);

    console.log('[Migration] Pending transactions indexes dropped');
  }
}
