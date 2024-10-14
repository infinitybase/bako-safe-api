import { RedisClientType, createClient } from 'redis';

const REDIS_URL_READ = process.env.REDIS_URL_WRITE || 'redis://127.0.0.1:6379';

export default class RedisReadClient {
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

  static async get(key: string): Promise<string> {
    try {
      return await RedisReadClient.client.get(key);
    } catch (e) {
      console.error('[CACHE_SESSIONS_GET_ERROR]', e, key);
    }
  }
}
