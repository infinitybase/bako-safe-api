import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to add retry_attempts column to transactions table.
 *
 * Stores an array of JSONB objects, one per send attempt, for auditing:
 *   { attempt: number, timestamp: string, error: string|null, duration_ms: number }
 */
export class AddRetryAttemptsToTransactions1764300000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "transactions"
      ADD COLUMN "retry_attempts" jsonb DEFAULT '[]'
    `);

    console.log(
      '[Migration] Added retry_attempts column to transactions table',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "transactions"
      DROP COLUMN IF EXISTS "retry_attempts"
    `);

    console.log(
      '[Migration] Dropped retry_attempts column from transactions table',
    );
  }
}
