import { PsqlClient } from "@/clients";
import type { SchemaPredicateBalance } from "../../../clients/mongoClient";
import { v4 as uuidv4 } from "uuid";

/**
 * Deposit transaction type enum matching the API
 */
export const TRANSACTION_TYPE_DEPOSIT = "DEPOSIT";
export const TRANSACTION_STATUS_SUCCESS = "success";

/**
 * Structure for a deposit transaction to be inserted in PostgreSQL
 */
export interface DepositTransaction {
  id: string;
  name: string;
  hash: string;
  type: string;
  tx_data: object;
  status: string;
  summary: object | null;
  send_time: Date;
  gas_used: string | null;
  resume: object;
  network: object;
  predicate_id: string;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Check if a deposit transaction already exists in the database
 */
export const depositExists = async (
  db: PsqlClient,
  hash: string,
  predicateId: string
): Promise<boolean> => {
  const result = await db.query(
    `SELECT id FROM transactions
     WHERE hash = $1 AND predicate_id = $2 AND type = $3
     LIMIT 1`,
    [hash, predicateId, TRANSACTION_TYPE_DEPOSIT]
  );

  return !!result;
};

/**
 * Get predicate info by address
 */
export const getPredicateByAddress = async (
  db: PsqlClient,
  predicateAddress: string
): Promise<{ id: string; owner_id: string; configurable: string } | null> => {
  const result = await db.query(
    `SELECT id, owner_id, configurable FROM predicates
     WHERE predicate_address = $1
     LIMIT 1`,
    [predicateAddress]
  );

  return result || null;
};

/**
 * Get network info for a predicate
 */
export const getNetworkForPredicate = async (
  db: PsqlClient,
  predicateId: string
): Promise<{ url: string; chain_id: number } | null> => {
  const result = await db.query(
    `SELECT n.url, n.chain_id
     FROM predicates p
     JOIN networks n ON p.network_id = n.id
     WHERE p.id = $1
     LIMIT 1`,
    [predicateId]
  );

  return result || null;
};

/**
 * Create a deposit transaction in the database
 */
export const createDepositTransaction = async (
  db: PsqlClient,
  deposit: SchemaPredicateBalance,
  predicateId: string,
  ownerId: string | null,
  network: { url: string; chainId: number }
): Promise<string | null> => {
  const txId = uuidv4();
  const now = new Date();

  // Build resume object similar to API format
  const resume = {
    hash: deposit.tx_id,
    status: TRANSACTION_STATUS_SUCCESS,
    witnesses: [],
    predicate: {
      id: predicateId,
      address: deposit.predicate,
    },
    id: deposit.tx_id,
  };

  // Build minimal tx_data
  const txData = {
    type: 0, // Script transaction
    outputs: [],
    inputs: [],
  };

  // Build summary with deposit info
  const summary = {
    operations: [
      {
        name: "Deposit",
        from: { type: "Unknown" },
        to: {
          type: "Predicate",
          address: deposit.predicate,
        },
        assetsSent: [
          {
            assetId: deposit.assetId,
            amount: deposit.amount.toString(),
          },
        ],
      },
    ],
  };

  try {
    await db.query(
      `INSERT INTO transactions (
        id, name, hash, type, tx_data, status, summary,
        send_time, gas_used, resume, network,
        predicate_id, created_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11,
        $12, $13, $14, $15
      )
      ON CONFLICT (hash, predicate_id) DO NOTHING`,
      [
        txId,
        "Deposit",
        deposit.tx_id.startsWith("0x") ? deposit.tx_id.slice(2) : deposit.tx_id,
        TRANSACTION_TYPE_DEPOSIT,
        JSON.stringify(txData),
        TRANSACTION_STATUS_SUCCESS,
        JSON.stringify(summary),
        deposit.createdAt,
        null,
        JSON.stringify(resume),
        JSON.stringify(network),
        predicateId,
        ownerId,
        now,
        now,
      ]
    );

    return txId;
  } catch (error) {
    console.error("[PERSIST_DEPOSIT] Error creating deposit transaction:", error);
    return null;
  }
};

/**
 * Persist multiple deposits to PostgreSQL
 * Only persists deposits where isDeposit = true
 */
export const persistDepositsToDatabase = async (
  deposits: SchemaPredicateBalance[],
  predicateAddress: string
): Promise<{ created: number; skipped: number }> => {
  const db = await PsqlClient.connect();
  let created = 0;
  let skipped = 0;

  // Get predicate info
  const predicate = await getPredicateByAddress(db, predicateAddress);
  if (!predicate) {
    console.warn(
      `[PERSIST_DEPOSIT] Predicate not found for address: ${predicateAddress}`
    );
    return { created: 0, skipped: deposits.length };
  }

  // Get network info
  const networkInfo = await getNetworkForPredicate(db, predicate.id);
  const network = networkInfo
    ? { url: networkInfo.url, chainId: networkInfo.chain_id }
    : { url: "https://mainnet.fuel.network/v1/graphql", chainId: 9889 };

  // Filter only actual deposits (not withdrawals)
  const actualDeposits = deposits.filter((d) => d.isDeposit && d.amount > 0);

  for (const deposit of actualDeposits) {
    // Check if deposit already exists
    const hash = deposit.tx_id.startsWith("0x")
      ? deposit.tx_id.slice(2)
      : deposit.tx_id;

    const exists = await depositExists(db, hash, predicate.id);
    if (exists) {
      skipped++;
      continue;
    }

    // Create the deposit transaction
    const txId = await createDepositTransaction(
      db,
      deposit,
      predicate.id,
      predicate.owner_id,
      network
    );

    if (txId) {
      created++;
    } else {
      skipped++;
    }
  }

  if (created > 0) {
    console.log(
      `[PERSIST_DEPOSIT] Created ${created} deposit transactions for ${predicateAddress}`
    );
  }

  return { created, skipped };
};
