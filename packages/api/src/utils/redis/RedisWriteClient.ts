import { RedisClientType, createClient } from 'redis';
import { RedisMockStore } from './redis-test-mock';

const REDIS_URL_WRITE = process.env.REDIS_URL_WRITE || 'redis://127.0.0.1:6379';
const TEST_MODE = process.env.TESTCONTAINERS_DB === 'true';

export class RedisWriteClient {
  private static client: RedisClientType;
  private static isMock = TEST_MODE;

  private constructor() {}

  static async start() {
    if (RedisWriteClient.isMock) {
      RedisWriteClient.client = (RedisMockStore as unknown) as RedisClientType;
      return;
    }

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
    if (RedisWriteClient.isMock) return;

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
      if (RedisWriteClient.isMock) {
        return RedisMockStore.set(key, String(value));
      }

      await RedisWriteClient.client.set(key, value, {
        EX: 60 * 40, // 40 min
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
      if (RedisWriteClient.isMock) {
        const obj: Record<string, string | number> = {};
        for (const { field, value } of values) {
          obj[field] = value;
        }
        return RedisMockStore.hSet(key, obj);
      }

      if (!RedisWriteClient.client.isOpen) return;

      const fields = values.map(({ field, value }) => [field, value]);
      await RedisWriteClient.client.hSet(key, fields.flat());
      await RedisWriteClient.client.expire(key, 60 * 40); // 40 min
    } catch (e) {
      console.error('[CACHE_HMSET_ERROR]', e, key, values);
    }
  }

  static async del(keys: string[]) {
    try {
      if (RedisWriteClient.isMock) {
        for (const key of keys) {
          await RedisMockStore.set(key, undefined);
        }
        return;
      }

      await RedisWriteClient.client.del(keys);
    } catch (e) {
      console.error('[CACHE_SESSIONS_REMOVE_ERROR]', e, keys);
    }
  }
}
