import app from '@src/server/app';
import { IAuthRequest } from '@middlewares/auth/types';

import { AuthStrategy } from './type';

export class TokenAuthStrategy implements AuthStrategy {
  async authenticate(req: IAuthRequest): Promise<{ user: any; workspace: any }> {
    const signature = req.headers.authorization;
    const token = await app._sessionCache.getSession(signature);

    return { user: token.user, workspace: token.workspace };
  }
}
