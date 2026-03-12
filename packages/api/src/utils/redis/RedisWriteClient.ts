import { RedisClientType, createClient } from 'redis';
import { logger } from '@src/config/logger';
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
        logger.error({ error: e }, '[REDIS WRITE CONNECT ERROR]');
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
        logger.error({ error: e }, '[REDIS WRITE DISCONNECT ERROR]');
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
      logger.error({ error: e, key, value }, '[CACHE_SET_ERROR]');
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
      logger.error({ error: e, key, values }, '[CACHE_HMSET_ERROR]');
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
      logger.error({ error: e, keys }, '[CACHE_SESSIONS_REMOVE_ERROR]');
    }
  }

  /**
   * Set a key with custom TTL (in seconds)
   */
  static async setWithTTL(key: string, value: string | number, ttlSeconds: number) {
    try {
      if (RedisWriteClient.isMock) {
        return RedisMockStore.set(key, String(value));
      }

      await RedisWriteClient.client.set(key, value, {
        EX: ttlSeconds,
      });
    } catch (e) {
      logger.error({ error: e, key }, '[CACHE_SET_WITH_TTL_ERROR]');
    }
  }

  /**
   * Delete keys matching a pattern using SCAN
   */
  static async delByPattern(pattern: string): Promise<number> {
    try {
      if (RedisWriteClient.isMock) {
        const keys = await RedisMockStore.scan(pattern);
        for (const key of keys.keys()) {
          await RedisMockStore.set(key, undefined);
        }
        return keys.size;
      }

      let deletedCount = 0;
      let cursor = 0;

      do {
        const result = await RedisWriteClient.client.scan(cursor, {
          MATCH: pattern,
          COUNT: 100,
        });
        cursor = result.cursor;

        if (result.keys.length > 0) {
          await RedisWriteClient.client.del(result.keys);
          deletedCount += result.keys.length;
        }
      } while (cursor !== 0);

      return deletedCount;
    } catch (e) {
      logger.error({ error: e, pattern }, '[CACHE_DEL_BY_PATTERN_ERROR]');
      return 0;
    }
  }

  static async ping(): Promise<string> {
    try {
      return RedisWriteClient.isMock
        ? 'PONG'
        : await RedisWriteClient.client.ping();
    } catch (e) {
      logger.error({ error: e }, '[REDIS_WRITE_PING_ERROR]');
      throw e;
    }
  }
}
