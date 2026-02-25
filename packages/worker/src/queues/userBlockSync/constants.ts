// Queue names
export const QUEUE_USER_BLOCK_SYNC = "QUEUE_USER_BLOCK_SYNC";
export const QUEUE_USER_LOGOUT_SYNC = "QUEUE_USER_LOGOUT_SYNC";

// Scheduler configuration
export const CRON_EXPRESSION_USER_SYNC = "*/10 * * * * *"; // Every 10 seconds
export const INITIAL_DELAY_USER_SYNC = 3 * 1000; // 3 seconds initial delay

// Block reading configuration
export const BLOCK_RANGE_SIZE = 1000; // Number of blocks to read per batch
export const MAX_BLOCKS_PER_USER = 5000; // Maximum blocks to process per user per cycle

// Redis keys
export const REDIS_KEY_PREFIX = "user_block_sync";
export const REDIS_KEY_LOGGED_USERS = `${REDIS_KEY_PREFIX}:logged_users`;
export const REDIS_KEY_USER_BLOCK = (userId: string) => `${REDIS_KEY_PREFIX}:user:${userId}:block`;
export const REDIS_KEY_USER_LAST_LOGIN = (userId: string) => `${REDIS_KEY_PREFIX}:user:${userId}:last_login`;

// Hypersync endpoint
export const HYPERSYNC_ENDPOINT = "https://fuel.hypersync.xyz/query";

// Transaction status
export const TX_STATUS_SUCCESS = 1;
