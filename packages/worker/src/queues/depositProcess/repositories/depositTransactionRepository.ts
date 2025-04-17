import { PsqlClient } from "@/clients";
import { PredicateDepositData } from "../types";
import { networks } from "@/mocks/networks";

export class DepositTransactionRepository {
  constructor(private readonly client: PsqlClient) {}

  private getNetwork() {
    // Todo[Erik]: Verificar se deve ser passado via env
    const defaultNetwork = {
      url: process.env.WORKER_ENVIRONMENT === 'production' ? networks['mainnet'] : networks['devnet'],
      chainId: process.env.FUEL_PROVIDER_CHAIN_ID ? Number(process.env.FUEL_PROVIDER_CHAIN_ID) : 0,
    };

    return defaultNetwork;
  }

  private safeJson(input: unknown): string {
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

  async createDepositTransaction(predicate_id: string, transaction: PredicateDepositData) {
    const query = `
      INSERT INTO deposit_transactions (
        predicate_id,
        hash,
        type,
        status,
        summary,
        "sendTime",
        network,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;

    const params = [
      String(predicate_id),
      String(transaction.hash),
      String(transaction.type),
      String(transaction.status),
      this.safeJson(transaction.summary),
      String(transaction.sendTime),
      this.safeJson(this.getNetwork()),
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
  
    let validIndex = 0;
    for (const [i, tx] of tx_deposits.entries()) {
      if (!tx.predicateId) {
        console.warn(`[IGNORE - No predicateId] Record ${i} ignored:`, tx);
        continue;
      }

      const offset = validIndex * 9;
      values.push(`(${Array.from({ length: 9 }, (_, j) => `$${offset + j + 1}`).join(', ')})`);
      params.push(
        predicate_id,
        tx.hash,
        tx.type,
        tx.status,
        this.safeJson(tx.summary),
        tx.sendTime,
        this.safeJson(this.getNetwork()),
        tx.created_at,
        tx.updated_at
      );

      validIndex++;
    };

    const query = `
      INSERT INTO deposit_transactions (
        predicate_id,
        hash,
        type,
        status,
        summary,
        "sendTime",
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