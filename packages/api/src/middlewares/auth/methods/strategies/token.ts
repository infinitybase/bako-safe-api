import { IAuthRequest } from '@middlewares/auth/types';

import { AuthStrategy } from './type';
import { TokenUtils } from '@src/utils/token/utils';

export class TokenAuthStrategy implements AuthStrategy {
  async authenticate(req: IAuthRequest): Promise<{ user: any; workspace: any }> {
    const signature = req.headers.authorization;
    const token = await TokenUtils.recoverToken(signature);
    await TokenUtils.renewToken(token);

    return {
      user: {
        id: token.user_id,
        name: token.name,
        avatar: token.avatar,
        address: token.address,
        type: token.type,
        webauthn: token.webauthn,
        email: token.email,
      },
      workspace: token.workspace,
    };
  }
}
