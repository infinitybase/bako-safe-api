import IORedis from "ioredis";

const { WORKER_REDIS_HOST } = process.env;

const redisClient = new IORedis({
  host: WORKER_REDIS_HOST,
  tls: {
    rejectUnauthorized: false,
  },
});

redisClient.on("connect", () =>
  console.log("[REDIS]: Connected to Redis successfully.")
);
redisClient.on("error", (err) =>
  console.error("[REDIS]: Error on Redis connection:", err)
);

export default redisClient;
