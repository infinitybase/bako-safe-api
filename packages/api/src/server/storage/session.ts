import { User } from '@src/models';
import UserToken from '@src/models/UserToken';
import { Workspace } from '@src/models/Workspace';
import { AuthService } from '@src/modules/auth/services';
import { ISignInResponse } from '@src/modules/auth/types';
import { isPast } from 'date-fns';
import * as redis from 'redis';

export interface ISession {
  nome: string;
  userToken: UserToken;
  workspace: Workspace;
  user: User;
}

const REFRESH_TIME = 300 * 1000; // 5 minutos
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

export class SessionStorage {
  private redisClient?: redis.RedisClientType;

  protected constructor() {
    this.redisClient = redis.createClient({
      url:
        'rediss://bako-safe-hmg-elasticache-i1bzt2.serverless.use1.cache.amazonaws.com:6379',
    });

    this.redisClient
      .connect()
      .then(() => {
        console.log('[CACHE_SESSIONS_CONNECTEDD]', new Date());
      })
      .catch(e => {
        console.error(e);
        process.exit(1);
      });
  }

  public async addSession(sessionId: string, session: ISignInResponse) {
    console.log('[CACHE_SESSIONS_ADD]', sessionId);
    await this.redisClient
      .set(sessionId, JSON.stringify(session))
      .then(result => {
        console.log('[CACHE_SESSIONS_ADDED]', result);
        return session;
      })
      .catch(e => {
        console.error(e);
        return null;
      });
  }

  public async getSession(sessionId: string) {
    let session: ISignInResponse;
    console.log('[GET_SESSIONS_GET]', sessionId);

    const sessionCache = await this.redisClient.get(sessionId);
    if (sessionCache) {
      session = JSON.parse(sessionCache) as ISignInResponse;
    } else {
      session = await this.getTokenOnDatabase(sessionId);
      this.addSession(sessionId, session);
    }

    return session ?? null;
  }

  public async updateSession(sessionId: string) {
    console.log('[CACHE_SESSIONS_UPDATE]', sessionId);
    let session = await this.getSession(sessionId);
    if (session && isPast(new Date(session.expired_at))) {
      await this.removeSession(sessionId);
    }
    session = await this.getTokenOnDatabase(sessionId);
    this.addSession(sessionId, session);
  }

  public async getTokenOnDatabase(sessionId: string) {
    console.log('[GET_SESSIONS_DB]', sessionId);
    const token = await AuthService.findToken(sessionId);
    return token;
  }

  // remove uma sessão do store e do database
  public async removeSession(sessionId: string) {
    console.log('[CACHE_SESSIONS_REMOVE]', sessionId);
    await UserToken.delete({
      token: sessionId,
    });
    await this.redisClient.del([sessionId]);
  }

  // limpa as sessões expiradas
  public async clearExpiredSessions() {
    console.log('[CACHE_SESSIONS_CLEARING]');
    const removedTokens = await AuthService.clearExpiredTokens();
    if (removedTokens.length > 0) {
      await this.redisClient.del(removedTokens);
    }
    console.log('[CACHE_SESSIONS_CLEARED]', removedTokens.length);
  }

  static start() {
    const _this = new SessionStorage();

    setInterval(() => {
      _this.clearExpiredSessions();
    }, REFRESH_TIME);

    return _this;
  }
}
