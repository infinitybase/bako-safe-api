import { RedisClientType, createClient } from 'redis';

const REDIS_URL_WRITE = process.env.REDIS_URL_WRITE || 'redis://127.0.0.1:6379';

export class RedisWriteClient {
  private static client: RedisClientType;

  private constructor() {}

  static async start() {
    if (!RedisWriteClient.client) {
      RedisWriteClient.client = createClient({ url: REDIS_URL_WRITE });

      try {
        await RedisWriteClient.client.connect();
      } catch (e) {
        console.error('[REDIS WRITE CONNECT ERROR]', e);
        process.exit(1);
      }
    }
  }

  static async stop() {
    if (RedisWriteClient.client) {
      try {
        await RedisWriteClient.client.disconnect();
      } catch (e) {
        console.error('[REDIS WRITE DISCONNECT ERROR]', e);
        process.exit(1);
      }
    }
  }

  static async set(key: string, value: string | number) {
    try {
      await RedisWriteClient.client.set(key, value, {
        EX: 60 * 40, // 5 min
      });
    } catch (e) {
      console.error('[CACHE_SET_ERROR]', e, key, value);
    }
  }

  static async hsetMany(
    key: string,
    values: { field: string; value: string | number }[],
  ) {
    try {
      if (!RedisWriteClient.client.isOpen) return;
      const fields = values.map(({ field, value }) => [field, value]);
      await RedisWriteClient.client.hSet(key, fields.flat());
      await RedisWriteClient.client.expire(key, 60 * 40); // 5 min
    } catch (e) {
      console.error('[CACHE_HMSET_ERROR]', e, key, values);
    }
  }

  static async del(keys: string[]) {
    try {
      await RedisWriteClient.client.del(keys);
    } catch (e) {
      console.error('[CACHE_SESSIONS_REMOVE_ERROR]', e, keys);
    }
  }
}
