import { RedisClientType, createClient } from 'redis';

const REDIS_URL_READ = process.env.REDIS_URL_WRITE || 'redis://127.0.0.1:6379';

export class RedisReadClient {
  private static client: RedisClientType;

  private constructor() {}

  static async start() {
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
      return await RedisReadClient.client.get(key);
    } catch (e) {
      console.error('[CACHE_SESSIONS_GET_ERROR]', e, key);
    }
  }

  static async hGetAll(key: string): Promise<Record<string, string | number>> {
    try {
      return await RedisReadClient.client.hGetAll(key);
    } catch (e) {
      console.error('[CACHE_SESSIONS_GET_ERROR]', e, key);
    }
  }

  static async scan(
    MATCH: string,
    COUNT: number = 100,
  ): Promise<Map<string, string>> {
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
}
