import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to add additional performance indexes
 *
 * Adds indexes for:
 * - predicates.predicate_address (frequent lookups by address)
 * - predicates.workspace_id (workspace filtering)
 * - transactions.created_by (user transaction history)
 * - users.address (user lookups by address)
 */
export class AddAdditionalPerformanceIndexes1764200000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Index for predicate address lookups (findByAddress)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_predicates_predicate_address"
      ON "predicates" ("predicate_address")
    `);

    // Index for workspace filtering on predicates
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_predicates_workspace_id"
      ON "predicates" ("workspace_id")
    `);

    // Index for user transaction history
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_transactions_created_by"
      ON "transactions" ("created_by")
    `);

    // Index for user lookups by address
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_address"
      ON "users" ("address")
    `);

    // Index for notification user filtering
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_notifications_user_id"
      ON "notifications" ("user_id")
    `);

    console.log('[Migration] Additional performance indexes created');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_notifications_user_id"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_address"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_transactions_created_by"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_predicates_workspace_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_predicates_predicate_address"`,
    );

    console.log('[Migration] Additional performance indexes dropped');
  }
}
