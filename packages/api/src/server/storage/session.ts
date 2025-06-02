import { User } from '@src/models';
import UserToken from '@src/models/UserToken';
import { Workspace } from '@src/models/Workspace';
import { AuthService } from '@src/modules/auth/services';
import { ISignInResponse } from '@src/modules/auth/types';
import { RedisReadClient, RedisWriteClient } from '@src/utils';
import { isPast } from 'date-fns';
import * as redis from 'redis';

export interface ISession {
  nome: string;
  userToken: UserToken;
  workspace: Workspace;
  user: User;
}

const REFRESH_TIME = 60 * 1000; // 1 minute
const PREFIX = 'session';

export class SessionStorage {
  private static instance?: SessionStorage;
  private static intervalRef?: NodeJS.Timeout;

  private redisClientWrite?: redis.RedisClientType;
  private redisClientRead?: redis.RedisClientType;

  private constructor() {}

  public async addSession(sessionId: string, session: ISignInResponse) {
    await RedisWriteClient.set(`${PREFIX}-${sessionId}`, JSON.stringify(session));
  }

  public async getSession(sessionId: string) {
    let session: ISignInResponse;
    const sessionCache = await RedisReadClient.get(`${PREFIX}-${sessionId}`);

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

  public async removeSession(sessionId: string) {
    await UserToken.delete({ token: sessionId });
    await RedisWriteClient.del([`${PREFIX}-${sessionId}`]);
  }

  public async clearExpiredSessions() {
    const removedTokens = await AuthService.clearExpiredTokens();
    if (removedTokens.length > 0) {
      await RedisWriteClient.del(removedTokens.map(t => `${PREFIX}-${t}`));
    }
  }

  static start(): SessionStorage {
    if (!SessionStorage.instance) {
      SessionStorage.instance = new SessionStorage();

      SessionStorage.intervalRef = setInterval(() => {
        SessionStorage.instance?.clearExpiredSessions();
      }, REFRESH_TIME);

      console.log('[REDIS] SESSION STARTED');
    }

    return SessionStorage.instance;
  }

  static stop(): void {
    if (SessionStorage.intervalRef) {
      clearInterval(SessionStorage.intervalRef);
      SessionStorage.intervalRef = undefined;
    }
  }
}
