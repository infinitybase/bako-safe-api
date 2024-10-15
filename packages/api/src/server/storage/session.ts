import { User } from '@src/models';
import UserToken from '@src/models/UserToken';
import { Workspace } from '@src/models/Workspace';
import { AuthService } from '@src/modules/auth/services';
import { ISignInResponse } from '@src/modules/auth/types';
import { RedisReadClient, RedisWriteClient } from '@src/utils';
import { isPast } from 'date-fns';

export interface ISession {
  nome: string;
  userToken: UserToken;
  workspace: Workspace;
  user: User;
}

const REFRESH_TIME = 60 * 1000; // 5 minutes
const PREFIX = 'session';

export class SessionStorage {
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

  // remove section from database
  public async removeSession(sessionId: string) {
    await UserToken.delete({
      token: sessionId,
    });
    await RedisWriteClient.del([`${PREFIX}-${sessionId}`]);
  }

  // clean experied sessions
  public async clearExpiredSessions() {
    const removedTokens = await AuthService.clearExpiredTokens();
    if (removedTokens.length > 0) {
      await RedisWriteClient.del(removedTokens.map(t => `${PREFIX}-${t}`));
    }
  }

  static start() {
    const _this = new SessionStorage();

    setInterval(() => {
      _this.clearExpiredSessions();
      console.log(`[STORE] SESSION REFRESHED - ${new Date()}`);
    }, REFRESH_TIME);

    console.log(`[REDIS] SESSION STARTED`);

    return _this;
  }
}
