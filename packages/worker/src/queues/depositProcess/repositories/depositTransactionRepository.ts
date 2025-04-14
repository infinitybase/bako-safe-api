import { PsqlClient } from "@/clients";
import { PredicateDepositData } from "../types";

export class DepositTransactionRepository {
  constructor(private readonly client: PsqlClient) {}

  async createDepositTransaction(predicate_id: string, transaction: PredicateDepositData) {
    // Todo[Erik]: Ajustar implementação para utilizar o schema do banco de dados e receber os dados de forma mais correta
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
  
    const values: string[] = [];
    const params: any[] = [];

    const safeJson = (input: unknown): string => {
      try {
        if (typeof input === 'string') {
          JSON.parse(input);
          return input;
        }

        return JSON.stringify(input, (key, value) => {
          if (value instanceof Date) {
            return value.toISOString();
          }
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

    tx_deposits.forEach((tx, i) => {
      const offset = i * 10;
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
    });

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
      return await this.client.query(query, params);
    } catch (err) {
      throw err;
    }
  };
}