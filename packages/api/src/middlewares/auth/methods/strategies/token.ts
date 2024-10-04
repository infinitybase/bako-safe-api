import { IAuthRequest } from '@middlewares/auth/types';

import { AuthStrategy } from './type';
import { TokenUtils } from '@src/utils/token/utils';
import { Network } from 'fuels';

export class TokenAuthStrategy implements AuthStrategy {
  async authenticate(
    req: IAuthRequest,
    // todo: check this types
  ): Promise<{ user: any; workspace: any; network: Network }> {
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
        first_login: token.first_login,
        notify: token.notify,
      },
      network: token.network,
      workspace: token.workspace,
    };
  }
}
