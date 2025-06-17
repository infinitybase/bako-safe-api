import { IAuthRequest } from '@middlewares/auth/types';

import { AuthStrategy } from './type';
import { TokenUtils } from '@src/utils/token/utils';
import { Network } from 'fuels';
import { TypeUser } from '@src/models';

export class TokenAuthStrategy implements AuthStrategy {
  async authenticate(
    req: IAuthRequest,
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
        evm: token.type === TypeUser.EVM ? {} : null,
        email: token.email,
        first_login: token.first_login,
        notify: token.notify,
        settings: token.settings,
      },
      network: token.network,
      workspace: token.workspace,
    };
  }
}
