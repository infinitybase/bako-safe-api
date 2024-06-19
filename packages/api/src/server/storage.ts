import { User } from "@src/models";
import UserToken from "@src/models/UserToken";
import { Workspace } from "@src/models/Workspace";
import { AuthService } from "@src/modules/auth/services"
import { TokenUtils } from "@src/utils";
import { isPast } from "date-fns";

export interface ISession {
    nome: string;
    userToken: UserToken;
    workspace: Workspace;
    user: User;
  }



export class SessionStorage {
    data = new Map<string, UserToken>();
    private nextClear: number = new Date().getTime() + 3600 * 1000; 

    constructor () {
        this.data = new Map<string, UserToken>();
    }

    // adiciona uma sessão ao store limpa as sessões expiradas
    public async addSession(sessionId: string, session: UserToken) {
        console.log('[SESSION_ADD]: ', sessionId)
        const pendingClear = new Date().getTime() > this.nextClear;
        pendingClear && await this.clearExpiredSessions();
        this.data.set(sessionId, session);
    }

    // busca inicialmente no store de sessões, caso nao exista, busca no database
    // verifica se a sessão está ativa -> passa pela renovacao de token
    public async getSession(sessionId: string) {
        const session = this.data.get(sessionId);
        console.log('[SESSION_GET]: ', sessionId)
        if (!session) {
            const token = await new AuthService().findToken({
                signature: sessionId
            })

            TokenUtils.renewToken(token);
            return token;
        }



        return session;
    }

    // remove uma sessão do store e do database
    public async removeSession(sessionId: string) {
        await UserToken.delete({
            token: sessionId
        });
        this.data.delete(sessionId);
    }


    public async clearExpiredSessions() {
            for await (const [sessionId, session] of this.data.entries()) {
                if (isPast(session.expired_at)) {
                    await UserToken.delete({
                        token: sessionId
                    });
                    this.data.delete(sessionId);
                }
            }
            this.nextClear = new Date().getTime() + 3600 * 1000;
    }


    public clear() {
        this.data.clear();
    }

}