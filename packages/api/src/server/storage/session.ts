import { User } from "@src/models";
import UserToken from "@src/models/UserToken";
import { Workspace } from "@src/models/Workspace";
import { AuthService } from "@src/modules/auth/services";
import { SocketClient } from "@src/socket/client";
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

//todo: move this
enum AuthNotifyType {
    REMOVE = '[REMOVE]',
    UPDATE = '[UPDATE]'
}
enum MessageType {
    DEFAULT = 'message'
}
enum AuthUsername {
    API = '[API]'
}



export class SessionStorage {
    private data = new Map<string, UserToken>();
    private client = new SocketClient(SESSION_ID, API_URL)


    protected constructor () {
        this.data = new Map<string, UserToken>();
        this.client.socket.on(
            MessageType.DEFAULT, 
            data => this.reciveNotify(data)
        )
    }


    private sendNotify(data, type){
        return this.client.sendMessage({
            type,
            data,
            sessionId: SESSION_ID,
            to: AuthUsername.API,
            request_id: SESSION_ID
        })
    }

    private reciveNotify({data, type}) {
        console.log('RECEIVED_MESSAGE', data, type);
        // type -> 
            // UPDATE: 
                // add more time on session
                // change wk
            // REMOVE:
                // logout
        switch (type) {
            case AuthNotifyType.UPDATE:
                this.addSession(data.token, data);
                break
            case AuthNotifyType.REMOVE:
                this.removeSession(data.token)
        }        
    }
    

    // adiciona uma sessão ao store limpa as sessões expiradas
    public async addSession(sessionId: string, session: UserToken) {
        this.data.set(sessionId, session);
        this.sendNotify(
            session,
            AuthNotifyType.UPDATE
        )
    }

    // - busca o token no store
    //      - se não encontrar busca no banco
    // - envia para a renovacao, que é renovado se necessário, se nao, retorna o mesmo token
    // - se o token estiver expirado, remove do store e do banco
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