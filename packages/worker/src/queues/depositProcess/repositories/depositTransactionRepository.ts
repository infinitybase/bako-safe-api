import { PsqlClient } from "@/clients";
import { PredicateDepositData } from "../types";

export class DepositTransactionRepository {
  constructor(private readonly client: PsqlClient) {}

  async createDepositTransaction(predicate_id: string, transaction: PredicateDepositData) {
    const query = `
      INSERT INTO deposit_transactions (
        predicate_reference_id,
        predicate_id,
        hash,
        type,
        status,
        summary,
        send_time,
        network,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;

    const params = [
      String(predicate_id),
      String(transaction.predicateId),
      String(transaction.hash),
      String(transaction.type),
      String(transaction.status),
      JSON.stringify(transaction.summary),
      String(transaction.sendTime),
      String(transaction.network),
      String(transaction.created_at),
      String(transaction.updated_at),
    ];

    const result = await this.client.query(query, params);
    return result;
  }

  async createAllDepositTransactions(predicate_id: string, tx_deposits: PredicateDepositData[]) {
    if (!tx_deposits.length) return;
  
    const CHUNK_SIZE = 1000;
  
    for (let i = 0; i < tx_deposits.length; i += CHUNK_SIZE) {
      const chunk = tx_deposits.slice(i, i + CHUNK_SIZE);
      await this.createChunkedDepositTransactions(predicate_id, chunk);
    }
  }

  private async createChunkedDepositTransactions(predicate_id: string, tx_deposits: PredicateDepositData[]) {
    const values: string[] = [];
    const params: any[] = [];
  
    const safeJson = (input: unknown): string => {
      try {
        if (typeof input === 'string') {
          JSON.parse(input);
          return input;
        }
        return JSON.stringify(input, (key, value) => {
          if (value instanceof Date) return value.toISOString();
          return value;
        });
      } catch (err) {
        return JSON.stringify({ 
          error: 'Invalid JSON', 
          raw: String(input), 
          details: err instanceof Error ? err.message : String(err) 
        });
      }
    }
  
    let validIndex = 0;
    for (const [i, tx] of tx_deposits.entries()) {
      if (!tx.predicateId) {
        console.warn(`[IGNORE - No predicateId] Record ${i} ignored:`, tx);
        continue;
      }

      const offset = validIndex * 10;
      values.push(`(${Array.from({ length: 10 }, (_, j) => `$${offset + j + 1}`).join(', ')})`);
      params.push(
        predicate_id,
        tx.predicateId,
        tx.hash,
        tx.type,
        tx.status,
        safeJson(tx.summary),
        tx.sendTime,
        safeJson(tx.network),
        tx.created_at,
        tx.updated_at
      );

      validIndex++;
    };
  
    const query = `
      INSERT INTO deposit_transactions (
        predicate_reference_id,
        predicate_id,
        hash,
        type,
        status,
        summary,
        send_time,
        network,
        created_at,
        updated_at
      )
      VALUES ${values.join(', ')}
    `;
  
    try {
      await this.client.query(query, params);
    } catch (err) {
      console.error('[ERROR INSERTING CHUNK]:', err);
      throw err;
    }
  }
}