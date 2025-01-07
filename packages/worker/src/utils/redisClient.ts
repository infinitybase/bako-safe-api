import IORedis from "ioredis";

const { WORKER_REDIS_HOST, WORKER_REDIS_PORT } = process.env;

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
