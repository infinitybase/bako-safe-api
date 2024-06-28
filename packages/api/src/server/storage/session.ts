import { User } from "@src/models";
import UserToken from "@src/models/UserToken";
import { Workspace } from "@src/models/Workspace";
import { AuthService } from "@src/modules/auth/services";
import { TokenUtils } from "@src/utils";
import { isPast } from "date-fns";

export interface ISession {
    nome: string;
    userToken: UserToken;
    workspace: Workspace;
    user: User;
  }

const CLEAR_TIME = 60 * 1000 * 23; // 23 minutos


export class SessionStorage {
    data = new Map<string, UserToken>();
    private nextClear: number = new Date().getTime() + CLEAR_TIME; 

    constructor () {
        this.data = new Map<string, UserToken>();
    }

    // adiciona uma sessão ao store limpa as sessões expiradas
    public async addSession(sessionId: string, session: UserToken) {
        const pendingClear = new Date().getTime() > this.nextClear;
        pendingClear && await this.clearExpiredSessions();
        this.data.set(sessionId, session);
    }

    // - busca o token no store
    //      - se não encontrar busca no banco
    // - envia para a renovacao, que é renovado se necessário, se nao, retorna o mesmo token
    // - se o token estiver expirado, remove do store e do banco
    public async getSession(sessionId: string) {
        let session = this.data.get(sessionId);
        if (!session) {
            session = await this.getTokenOnDatabase(sessionId);
        }

        if (session && isPast(session.expired_at)) {
            await this.removeSession(sessionId);
            return null;
        }

        return session;
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
    }

    // limpa as sessões expiradas
    public async clearExpiredSessions() {
            for await (const [sessionId, session] of this.data.entries()) {
                if (isPast(session.expired_at)) {
                    await UserToken.delete({
                        id: session.id
                    });
                    this.data.delete(sessionId);
                }
            }
            new AuthService().clearExpiredTokens();
            this.nextClear = new Date().getTime() + CLEAR_TIME;
    }


    public clear() {
        this.data.clear();
    }

}