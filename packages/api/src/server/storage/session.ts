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

const REFRESH_TIME = 300 * 1000; // 5 minutes
const REDIS_URL_WRITE = process.env.REDIS_URL_WRITE || 'redis://127.0.0.1:6379';
const REDIS_URL_READ = process.env.REDIS_URL_READ || 'redis://127.0.0.1:6379';
const PREFIX = 'session';

export class SessionStorage {
  private redisClientWrite?: redis.RedisClientType;
  private redisClientRead?: redis.RedisClientType;

  protected constructor() {
    this.redisClientWrite = redis.createClient({
      url: REDIS_URL_WRITE,
    });

    this.redisClientRead = redis.createClient({
      url: REDIS_URL_READ,
    });

    this.redisClientWrite.connect().catch(e => {
      console.error('[REDIS WRITE CONNECT ERROR]', e);
      process.exit(1);
    });

    this.redisClientRead.connect().catch(e => {
      console.error('[REDIS READ CONNECT ERROR]', e);
      process.exit(1);
    });
  }

  public async addSession(sessionId: string, session: ISignInResponse) {
    await this.redisClientWrite
      .set(`${PREFIX}-${sessionId}`, JSON.stringify(session))
      .catch(e => {
        console.error(
          '[CACHE_SESSIONS_ADD_ERROR]',
          e,
          `${PREFIX}-${sessionId}`,
          JSON.stringify(session),
        );
      });
  }

  public async getSession(sessionId: string) {
    let session: ISignInResponse;
    const sessionCache = await this.redisClientRead.get(`${PREFIX}-${sessionId}`);

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

  // remove section from database
  public async removeSession(sessionId: string) {
    await UserToken.delete({
      token: sessionId,
    });
    await this.redisClientWrite.del([`${PREFIX}-${sessionId}`]);
  }

  // clean experied sessions
  public async clearExpiredSessions() {
    const removedTokens = await AuthService.clearExpiredTokens();
    if (removedTokens.length > 0) {
      await this.redisClientWrite.del(removedTokens.map(t => `${PREFIX}-${t}`));
    }
  }

  static start() {
    const _this = new SessionStorage();

    setInterval(() => {
      _this.clearExpiredSessions();
    }, REFRESH_TIME);

    return _this;
  }
}
