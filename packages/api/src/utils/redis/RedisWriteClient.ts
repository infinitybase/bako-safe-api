import { RedisClientType, createClient } from 'redis';

const REDIS_URL_WRITE = process.env.REDIS_URL_WRITE || 'redis://127.0.0.1:6379';

export default class RedisWriteClient {
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

  static async set(key: string, value: string) {
    try {
      await RedisWriteClient.client.set(key, value);
    } catch (e) {
      console.error('[CACHE_SESSIONS_ADD_ERROR]', e, key, value);
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
