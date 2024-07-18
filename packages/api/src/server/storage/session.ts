
import { User } from "@src/models";
import UserToken from "@src/models/UserToken";
import { Workspace } from "@src/models/Workspace";
import { AuthService } from "@src/modules/auth/services";
import { SocketClient } from "@src/socket/client";
import { AuthNotifyType, SocketEvents, SocketUsernames } from "@src/socket/types";
import { TokenUtils } from "@src/utils";
import { isPast } from "date-fns";


export interface ISession {
  nome: string;
  userToken: UserToken;
  workspace: Workspace;
  user: User;
}

const REFRESH_TIME = 30 * 1000 * 10; // 23 minutos
const { API_URL } = process.env;
// move to env const
const SESSION_ID = '123' // is a const because all clients (apis) join on the same room


export class SessionStorage {

    private data = new Map<string, UserToken>();
    private client = new SocketClient(SESSION_ID, API_URL);


    protected constructor () {
        this.data = new Map<string, UserToken>();
        this.client.socket.onAny(
            (event, ...args) => {
                console.log('[EVENT]', event, args);
                if (event === SocketEvents.DEFAULT) {
                    this.reciveNotify(args[0]);
                }
            }
        )

        new SocketClient(SESSION_ID, API_URL);
    }


    private sendNotify(data, type){
        return this.client.sendMessage({
            type,
            data,
            sessionId: SESSION_ID,
            to: SocketUsernames.API,
            request_id: undefined,
        })
    }

    private reciveNotify({data, type}) {
        switch (type) {
            case AuthNotifyType.UPDATE:
                this.data.set(data.token, data);
                break
            case AuthNotifyType.REMOVE:
                this.data.delete(data.token)
        }        

        console.log('[SESSIONS]', this.data.size); 
    }

    public async addSession(sessionId: string, session: UserToken) {
        this.data.set(sessionId, session);
        this.sendNotify(
            session,
            AuthNotifyType.UPDATE
        )
    }

    public async getSession(sessionId: string) {
        let session = this.data.get(sessionId);
        console.log('[QUANTIDADE_DE_SESSOES]: ', this.data.size);
        if (!session) {
            session = await this.getTokenOnDatabase(sessionId);
            this.addSession(sessionId, session);
        }

        if (session && isPast(session.expired_at)) {
            await this.removeSession(sessionId);
            return null;
        }

        return session ?? null;
  }

  public async getTokenOnDatabase(sessionId: string) {
    const token = await TokenUtils.getTokenBySignature(sessionId);

    return token;
  }


  // remove uma sessão do store e do database
  public async removeSession(sessionId: string) {
      await UserToken.delete({
          token: sessionId
      });
      this.data.delete(sessionId);
      this.sendNotify({ token: sessionId }, AuthNotifyType.REMOVE)
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
      console.log('[CLEAR_EXPIRED_TOKEN]', new Date());
      _this.clearExpiredSessions();
    }, REFRESH_TIME);

    return _this;
  }
}
