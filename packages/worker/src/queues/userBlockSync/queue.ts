import Queue from "bull";
import { redisConfig } from "@/clients";
import {
  QUEUE_USER_BLOCK_SYNC,
  BLOCK_RANGE_SIZE,
  MAX_BLOCKS_PER_USER,
} from "./constants";
import type { QueueUserBlockSync, BlockSyncResult } from "./types";
import {
  getUserLastBlock,
  setUserLastBlock,
  getCurrentBlockHeight,
  persistDepositsToDatabase,
} from "./utils";
import {
  CollectionName,
  MongoDatabase,
  type SchemaPredicateBalance,
  type SchemaFuelAssets,
  type SchemaPredicateBlocks,
} from "../../clients/mongoClient";
import {
  groupByTransaction,
  makeDeposits,
  syncBalance,
  syncAssets,
  syncPredicateBlock,
} from "../predicateBalance";
import type { PredicateBalance } from "../predicateBalance/types";
import { makeQuery } from "../predicateBalance/utils/envioQuery";

const userBlockSyncQueue = new Queue<QueueUserBlockSync>(QUEUE_USER_BLOCK_SYNC, {
  redis: redisConfig,
});

/**
 * User Block Sync Queue
 *
 * This queue processes block synchronization for logged-in users.
 *
 * Process:
 * 1. Get user's last synced block from Redis
 * 2. Fetch blocks in ranges (BLOCK_RANGE_SIZE) until reaching current tip or MAX_BLOCKS_PER_USER
 * 3. Process transactions found for user's predicates
 * 4. Update last synced block in Redis
 * 5. If reached tip or processed max blocks, move to next user
 */
userBlockSyncQueue.process(async (job) => {
  const { user_id, predicates } = job.data;

  if (!predicates || predicates.length === 0) {
    return {
      user_id,
      blocks_processed: 0,
      transactions_found: 0,
      current_block: 0,
      reached_tip: true,
    } as BlockSyncResult;
  }

  const db = await MongoDatabase.connect();
  const balanceCollection = db.getCollection<SchemaPredicateBalance>(
    CollectionName.PREDICATE_BALANCE
  );
  const assetsCollection = db.getCollection<SchemaFuelAssets>(CollectionName.FUEL_ASSETS);
  const priceCollection = db.getCollection<SchemaFuelAssets>(CollectionName.ASSET_BALANCE);
  const predicateBlockCollection = db.getCollection<SchemaPredicateBlocks>(
    CollectionName.PREDICATE_BLOCKS
  );

  let userLastBlock = await getUserLastBlock(user_id);
  let currentTip: number;

  try {
    currentTip = await getCurrentBlockHeight();
  } catch {
    // If we can't get current tip, use a large number and let hypersync tell us
    currentTip = userLastBlock + MAX_BLOCKS_PER_USER;
  }

  let blocksProcessed = 0;
  let totalTransactions = 0;
  let reachedTip = false;

  try {
    // Process each predicate for this user
    for (const predicateAddress of predicates) {
      let predicateLastBlock = userLastBlock;

      while (blocksProcessed < MAX_BLOCKS_PER_USER && !reachedTip) {
        // Check if we've reached the tip
        if (predicateLastBlock >= currentTip) {
          reachedTip = true;
          break;
        }

        // Fetch transactions using existing query format
        const response = await fetch(
          "https://fuel.hypersync.xyz/query",
          makeQuery({
            from_block: predicateLastBlock,
            predicate_address: predicateAddress,
          })
        );

        const data = await response.json();
        const hypersyncData: PredicateBalance[] = data.data ?? [];
        const nextBlock: number = data.next_block ?? predicateLastBlock + BLOCK_RANGE_SIZE;

        if (hypersyncData.length > 0) {
          // Group and process transactions
          const txGrouped = groupByTransaction(hypersyncData);
          const txCount = Object.keys(txGrouped).length;

          if (txCount > 0) {
            // Sync predicate block info
            const predicateSyncBlock: SchemaPredicateBlocks = {
              _id: predicateAddress,
              blockNumber: nextBlock,
              timestamp: Date.now(),
              transactions: txCount,
            };
            await syncPredicateBlock(predicateSyncBlock, predicateBlockCollection);

            // Process balance
            const deposits = await makeDeposits(txGrouped, predicateAddress);
            const assets = await syncAssets(deposits, assetsCollection);
            await syncBalance(deposits, balanceCollection, assets, priceCollection);

            // Persist deposit transactions to PostgreSQL
            const { created: depositsCreated } = await persistDepositsToDatabase(
              deposits,
              predicateAddress
            );

            totalTransactions += txCount + depositsCreated;
          }
        }

        // Update progress
        predicateLastBlock = nextBlock;
        blocksProcessed += BLOCK_RANGE_SIZE;

        // Check if we've reached the tip or no more data
        if (predicateLastBlock >= currentTip || hypersyncData.length === 0) {
          reachedTip = true;
        }
      }
    }

    // Save final progress to Redis
    const finalBlock = Math.max(userLastBlock, userLastBlock + blocksProcessed);
    await setUserLastBlock(user_id, finalBlock);

    console.log(
      `[${QUEUE_USER_BLOCK_SYNC}] User ${user_id}: processed ${blocksProcessed} blocks, ` +
        `${totalTransactions} transactions, reached_tip: ${reachedTip}`
    );

    return {
      user_id,
      blocks_processed: blocksProcessed,
      transactions_found: totalTransactions,
      current_block: finalBlock,
      reached_tip: reachedTip,
    } as BlockSyncResult;
  } catch (error) {
    console.error(`[${QUEUE_USER_BLOCK_SYNC}] Error processing user ${user_id}:`, error);
    throw error;
  }
});

// Event handlers for monitoring
userBlockSyncQueue.on("completed", (job, result: BlockSyncResult) => {
  console.log(
    `[${QUEUE_USER_BLOCK_SYNC}] Job ${job.id} completed for user ${result.user_id}`
  );
});

userBlockSyncQueue.on("failed", (job, err) => {
  console.error(
    `[${QUEUE_USER_BLOCK_SYNC}] Job ${job.id} failed for user ${job.data.user_id}:`,
    err.message
  );
});

export default userBlockSyncQueue;
