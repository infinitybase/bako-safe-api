const { WORKER_REDIS_HOST } = process.env;

const isLocal = WORKER_REDIS_HOST?.includes("127.");

export const redisConfig = {
  host: WORKER_REDIS_HOST,
  port: 6379,
  ...(isLocal ? { tls: { rejectUnauthorized: false } } : {}),
};
