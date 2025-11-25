import { RedisClientType, createClient } from 'redis';
import { RedisMockStore } from './redis-test-mock';

const REDIS_URL_READ = process.env.REDIS_URL_WRITE || 'redis://127.0.0.1:6379';
const TEST_MODE = process.env.TESTCONTAINERS_DB === 'true';

export class RedisReadClient {
  private static client: RedisClientType;
  private static isMock = TEST_MODE;

  private constructor() {}

  static async start() {
    if (RedisReadClient.isMock) {
      console.log('[RedisReadClient] Rodando com mock em memória');
      RedisReadClient.client = (RedisMockStore as unknown) as RedisClientType;
      return;
    }

    if (!RedisReadClient.client) {
      RedisReadClient.client = createClient({ url: REDIS_URL_READ });

      try {
        await RedisReadClient.client.connect();
      } catch (e) {
        console.error('[REDIS WRITE CONNECT ERROR]', e);
        process.exit(1);
      }
    }
  }

  static async stop() {
    if (RedisReadClient.isMock) return;

    if (RedisReadClient.client) {
      try {
        await RedisReadClient.client.disconnect();
      } catch (e) {
        console.error('[REDIS READ DISCONNECT ERROR]', e);
        process.exit(1);
      }
    }
  }

  static async get(key: string): Promise<string> {
    try {
      return RedisReadClient.isMock
        ? await RedisMockStore.get(key)
        : await RedisReadClient.client.get(key);
    } catch (e) {
      console.error('[CACHE_SESSIONS_GET_ERROR]', e, key);
    }
  }

  static async hGetAll(key: string): Promise<Record<string, string | number>> {
    try {
      return RedisReadClient.isMock
        ? await RedisMockStore.hGetAll(key)
        : await RedisReadClient.client.hGetAll(key);
    } catch (e) {
      console.error('[CACHE_SESSIONS_GET_ERROR]', e, key);
    }
  }

  static async scan(
    MATCH: string,
    COUNT: number = 100,
  ): Promise<Map<string, string>> {
    if (RedisReadClient.isMock) {
      return RedisMockStore.scan(MATCH);
    }

    const result = new Map<string, string>();
    const { keys } = await RedisReadClient.client.scan(0, {
      MATCH,
      COUNT,
    });
    const values = await RedisReadClient.client.mGet(keys);

    for (let i = 0; i < keys.length; i++) {
      result.set(keys[i], values[i]);
    }

    return result;
  }

  /**
   * Get all keys matching a pattern (for debugging/stats)
   */
  static async keys(pattern: string): Promise<string[]> {
    try {
      if (RedisReadClient.isMock) {
        const result = await RedisMockStore.scan(pattern);
        return Array.from(result.keys());
      }

      const allKeys: string[] = [];
      let cursor = 0;

      do {
        const result = await RedisReadClient.client.scan(cursor, {
          MATCH: pattern,
          COUNT: 100,
        });
        cursor = result.cursor;
        allKeys.push(...result.keys);
      } while (cursor !== 0);

      return allKeys;
    } catch (e) {
      console.error('[CACHE_KEYS_ERROR]', e, pattern);
      return [];
    }
  }

  /**
   * Get TTL of a key in seconds
   */
  static async ttl(key: string): Promise<number> {
    try {
      if (RedisReadClient.isMock) {
        return -1; // Mock doesn't support TTL
      }

      return await RedisReadClient.client.ttl(key);
    } catch (e) {
      console.error('[CACHE_TTL_ERROR]', e, key);
      return -1;
    }
  }
}
