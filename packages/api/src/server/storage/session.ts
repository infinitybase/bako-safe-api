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
      url: REDIS_URL,
      socket: {
        tls: false,
      },
    });

    this.redisClient.connect().catch(e => {
      console.error(e);
      process.exit(1);
    });
  }

  public async addSession(sessionId: string, session: ISignInResponse) {
    this.redisClient.set(sessionId, JSON.stringify(session));
  }

  public async getSession(sessionId: string) {
    let session: ISignInResponse;

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
    let session = await this.getSession(sessionId);
    if (session && isPast(new Date(session.expired_at))) {
      await this.removeSession(sessionId);
    }
    session = await this.getTokenOnDatabase(sessionId);
    this.addSession(sessionId, session);
  }

  public async getTokenOnDatabase(sessionId: string) {
    const token = await AuthService.findToken(sessionId);
    return token;
  }

  // remove uma sessão do store e do database
  public async removeSession(sessionId: string) {
    await UserToken.delete({
      token: sessionId,
    });
    await this.redisClient.del([sessionId]);
  }

  // limpa as sessões expiradas
  public async clearExpiredSessions() {
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
