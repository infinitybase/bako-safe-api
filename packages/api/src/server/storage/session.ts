import { User } from '@src/models';
import UserToken from '@src/models/UserToken';
import { Workspace } from '@src/models/Workspace';
import { AuthService } from '@src/modules/auth/services';
import { ISignInResponse } from '@src/modules/auth/types';
import { SocketClient } from '@src/socket/client';
import { AuthNotifyType, SocketEvents, SocketUsernames } from '@src/socket/types';
import { isPast } from 'date-fns';

export interface ISession {
  nome: string;
  userToken: UserToken;
  workspace: Workspace;
  user: User;
}

const REFRESH_TIME = 1 * 1000 * 10; // 23 minutos
const { API_URL } = process.env;
// move to env const
const { API_SOCKET_SESSION_ID } = process.env; // is a const because all clients (apis) join on the same room

const SESSION_MOCK = {
  accessToken:
    '0x0a66fd714ba3a00d53ae20dff94b34504912cf6b80ec5352d404de7704d0648157277e973a5df119e29d81b2a3d977f97af5576d7556d8a2ef4be5f1f5cef63d',
  expired_at: new Date('3926-02-03T22:31:34.518Z'),
  name: '0xc2f56808ab402cfd2036a0309b5caf317287e39a636c2bb1235aaf7a804d98b9',
  type: 'FUEL',
  user_id: '8491167a-e748-451a-bd4a-74689c0f5a1e',
  avatar: 'https://besafe-asset.s3.amazonaws.com/icon/users/885.jpg',
  address: '0xc2f56808ab402cfd2036a0309b5caf317287e39a636c2bb1235aaf7a804d98b9',
  rootWallet: 'f450f9b6-581d-4c43-a9cf-d26f4ddb537d',
  webauthn: null,
  email: null,
  notify: false,
  first_login: false,
  network: { url: 'http://localhost:4000/v1/graphql', chainId: 0 },
  workspace: {
    id: '1fd2e553-9725-41d1-9dd2-6d94a856ef37',
    createdAt: undefined,
    deletedAt: undefined,
    updatedAt: undefined,
    name: 'singleWorkspace[8491167a-e748-451a-bd4a-74689c0f5a1e]',
    description: null,
    avatar: 'https://besafe-asset.s3.amazonaws.com/icon/users/1140.jpg',
    owner: undefined,
    single: true,
    permissions: {
      '8491167a-e748-451a-bd4a-74689c0f5a1e': {
        OWNER: ['*'],
        ADMIN: [''],
        MANAGER: [''],
        SIGNER: [''],
        VIEWER: [''],
      },
    },
    predicates: undefined,
    addressBook: undefined,
    members: undefined,
  },
};

export class SessionStorage {
  private data = new Map<string, ISignInResponse>();
  private client = new SocketClient(API_SOCKET_SESSION_ID, API_URL);

  protected constructor() {
    this.data = new Map<string, ISignInResponse>();
    this.client.socket.onAny((event, ...args) => {
      if (event === SocketEvents.DEFAULT) {
        this.reciveNotify(args[0]);
      }
    });
  }

  private sendNotify(data, type) {
    return this.client.sendMessage({
      type,
      data,
      sessionId: API_SOCKET_SESSION_ID,
      to: SocketUsernames.API,
      request_id: undefined,
    });
  }

  private reciveNotify({ type, data }) {
    if (!data || !data.token) {
      return;
    }

    switch (type) {
      case AuthNotifyType.UPDATE:
        this.data.set(data.token, data);
        break;
      case AuthNotifyType.REMOVE:
        this.data.delete(data.token);
        break;
      default:
        break;
    }
  }

  public async addSession(sessionId: string, session: ISignInResponse) {
    return;
    this.data.set(sessionId, session);
    this.sendNotify(
      {
        ...session,
        token: sessionId,
      },
      AuthNotifyType.UPDATE,
    );
  }

  public async getSession(sessionId: string) {
    const session = SESSION_MOCK;
    //let session = this.data.get(sessionId);

    // if (!session) {
    //   session = await this.getTokenOnDatabase(sessionId);
    //   this.addSession(sessionId, session);
    // }

    // if (session && isPast(new Date(session.expired_at))) {
    //   await this.removeSession(sessionId);
    //   return null;
    // }

    return session ?? null;
  }

  public async updateSession(sessionId: string) {
    let session = this.data.get(sessionId);

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
    this.data.delete(sessionId);
    this.sendNotify({ token: sessionId }, AuthNotifyType.REMOVE);
  }

  // limpa as sessões expiradas
  public async clearExpiredSessions() {
    await AuthService.clearExpiredTokens();
    this.data.clear();
    console.log('[CACHE_SESSIONS_CLEARED]', this.data.size);
  }

  public getActiveSessions() {
    return this.data.size;
  }

  public clear() {
    this.data.clear();
  }

  static start() {
    const _this = new SessionStorage();

    setInterval(() => {
      _this.clearExpiredSessions();
      console.log('[ACTIVE SESSIONS]: ', _this.data);
    }, REFRESH_TIME);

    return _this;
  }
}
