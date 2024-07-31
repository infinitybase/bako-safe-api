import { TransactionStatus } from 'bakosafe';
import { Address, bn, OutputType, TransactionRequestOutput } from 'fuels';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInputsOutputsAndTypeToTransactionResume1722434411006
  implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();

    try {
      // Replace BakoSafeID with id in resume
      await queryRunner.query(`
      UPDATE transactions
      SET resume = jsonb_set(
          resume - 'BakoSafeID',
          '{id}',
          resume->'BakoSafeID'
      )
      WHERE resume ? 'BakoSafeID' 
        AND status != '${TransactionStatus.SUCCESS}'; 
    `);

      // Add inputs and type to resume and set outputs with new format
      await queryRunner.query(`
      UPDATE transactions
      SET resume = jsonb_set(
          jsonb_set(
              jsonb_set(
                  resume,
                  '{inputs}',
                  (SELECT jsonb_agg(input - 'predicate') FROM jsonb_array_elements(COALESCE(tx_data->'inputs', '[]'::jsonb)) AS input)
              ),
              '{outputs}',
              COALESCE(tx_data->'outputs', '[]'::jsonb)
          ),
          '{type}',
          tx_data->'type'
      )
      WHERE status != '${TransactionStatus.SUCCESS}';
  `);
      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();

    try {
      // Replace id with BakoSafeID in resume
      await queryRunner.query(`
      UPDATE transactions
      SET resume = jsonb_set(resume, '{BakoSafeID}', resume->'id') - 'id'
      WHERE resume ? 'id' 
        AND status != '${TransactionStatus.SUCCESS}';
    `);

      // Get transactions
      const transactions = await queryRunner.query(`
      SELECT id, resume->'outputs' AS outputs
      FROM transactions
      WHERE status != '${TransactionStatus.SUCCESS}';
    `);

      // Convert addresses and amount values to the appropriate format
      for (const transaction of transactions) {
        let outputs = transaction.outputs || [];

        // Filtrar outputs com type igual a 0 e converter valores
        outputs = outputs
          .map((output: TransactionRequestOutput) => {
            if (output.type === OutputType.Coin) {
              // Convert 'to' from b256 to Bech32
              output.to = Address.fromString(output.to.toString()).bech32Address;

              // Convert 'amount' from BN to string
              output.amount = bn(output.amount).format();

              // Remove 'type' from output
              delete output.type;

              return output;
            }
            return null;
          })
          .filter(Boolean);

        // If no output is found, use an empty array
        const finalOutputs = outputs.length > 0 ? outputs : [];

        // Updates resume with outputs in the old format
        await queryRunner.query(`
          UPDATE transactions
          SET resume = jsonb_set(resume, '{outputs}', '${JSON.stringify(
            finalOutputs,
          )}'::jsonb)
          WHERE id = '${transaction.id}';
        `);

        // Remove inputs and type from resume
        await queryRunner.query(`
            UPDATE transactions
            SET resume = resume - 'inputs' - 'type'
            WHERE id = '${transaction.id}';
          `);
      }

      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    }
  }
}
