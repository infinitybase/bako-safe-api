import Queue from "bull";
import { redisConfig } from "@/clients";
import { QUEUE_USER_LOGOUT_SYNC } from "./constants";
import type { QueueUserLogoutSync } from "./types";
import {
  getUserLastBlock,
  cleanupUserBlockSyncData,
} from "./utils";
import {
  CollectionName,
  MongoDatabase,
} from "../../clients/mongoClient";

/**
 * Schema for persisting user block state to MongoDB
 */
export interface SchemaUserBlockControl {
  _id: string; // user_id
  last_block: number;
  last_sync: Date;
  predicates: string[];
}

const userLogoutSyncQueue = new Queue<QueueUserLogoutSync>(QUEUE_USER_LOGOUT_SYNC, {
  redis: redisConfig,
});

/**
 * User Logout Sync Queue
 *
 * This queue is triggered when a user logs out or their token expires.
 * It persists the user's last synced block state from Redis to MongoDB
 * for recovery when they log in again.
 *
 * Process:
 * 1. Get user's last block state from Redis
 * 2. Save to MongoDB (user_block_control collection)
 * 3. Clean up Redis data for this user
 */
userLogoutSyncQueue.process(async (job) => {
  const { user_id, last_block, predicates } = job.data;

  const db = await MongoDatabase.connect();
  const collection = db.getCollection<SchemaUserBlockControl>(
    CollectionName.USER_BLOCK_CONTROL
  );

  try {
    // Get the actual last block from Redis (might be more recent than job data)
    const redisLastBlock = await getUserLastBlock(user_id);
    const blockToSave = Math.max(last_block, redisLastBlock);

    // Persist to MongoDB
    await collection.updateOne(
      { _id: user_id },
      {
        $set: {
          last_block: blockToSave,
          last_sync: new Date(),
          predicates: predicates,
        },
      },
      { upsert: true }
    );

    // Clean up Redis data
    await cleanupUserBlockSyncData(user_id);

    console.log(
      `[${QUEUE_USER_LOGOUT_SYNC}] Persisted block ${blockToSave} for user ${user_id}`
    );

    return {
      user_id,
      persisted_block: blockToSave,
      success: true,
    };
  } catch (error) {
    console.error(
      `[${QUEUE_USER_LOGOUT_SYNC}] Error persisting state for user ${user_id}:`,
      error
    );
    throw error;
  }
});

// Event handlers
userLogoutSyncQueue.on("completed", (job, result) => {
  console.log(
    `[${QUEUE_USER_LOGOUT_SYNC}] Job ${job.id} completed: user ${result.user_id} ` +
      `block ${result.persisted_block}`
  );
});

userLogoutSyncQueue.on("failed", (job, err) => {
  console.error(
    `[${QUEUE_USER_LOGOUT_SYNC}] Job ${job.id} failed for user ${job.data.user_id}:`,
    err.message
  );
});

/**
 * Helper function to trigger logout sync from API
 */
export const triggerLogoutSync = async (
  userId: string,
  predicates: string[]
): Promise<void> => {
  const lastBlock = await getUserLastBlock(userId);

  await userLogoutSyncQueue.add(
    {
      user_id: userId,
      last_block: lastBlock,
      predicates,
    },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      removeOnComplete: true,
      removeOnFail: false,
      // High priority for logout operations
      priority: 1,
    }
  );
};

/**
 * Get user's last persisted block from MongoDB (for login recovery)
 */
export const getPersistedUserBlock = async (
  userId: string
): Promise<number> => {
  const db = await MongoDatabase.connect();
  const collection = db.getCollection<SchemaUserBlockControl>(
    CollectionName.USER_BLOCK_CONTROL
  );

  const record = await collection.findOne({ _id: userId });
  return record?.last_block ?? 0;
};

export default userLogoutSyncQueue;
