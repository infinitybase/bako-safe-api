import IORedis from "ioredis";

const { WORKER_REDIS_HOST, WORKER_REDIS_PORT } = process.env;

const isLocal = WORKER_REDIS_HOST?.includes("127.") ?? false;

export const redisConfig = {
  host: WORKER_REDIS_HOST,
  port: 6379,
  ...(!isLocal ? { tls: { rejectUnauthorized: false } } : {}),
};

const redisClient = new IORedis({
  host: WORKER_REDIS_HOST,
  port: Number(WORKER_REDIS_PORT),
});

redisClient.on("connect", () =>
  console.log("[REDIS]: Connected to Redis successfully.")
);
redisClient.on("error", (err) =>
  console.error("[REDIS]: Error on Redis connection:", err)
);

export default redisClient;
