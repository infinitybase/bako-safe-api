const { WORKER_REDIS_HOST } = process.env;

export const redisConfig = {
  host: WORKER_REDIS_HOST,
  port: 6379,
  tls: {
    rejectUnauthorized: false,
  },
};
