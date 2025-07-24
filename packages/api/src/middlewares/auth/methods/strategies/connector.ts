import { IAuthRequest } from '@middlewares/auth/types';
import { ErrorTypes, Unauthorized, UnauthorizedErrorTitles } from '@utils/error';
import { DApp } from '@src/models';
import { AuthStrategy, IValidatePathParams } from './type';

export class ConnectorAuthStrategy implements AuthStrategy {
  async authenticate(req: IAuthRequest) {
    console.log('ConnectorAuthStrategy');
    const sessionId = req?.headers?.authorization;
    const predicateAddress = req?.headers?.signeraddress;

    if (!sessionId || !predicateAddress) {
      console.log('SessionId and predicate address are required');
      throw new Unauthorized({
        type: ErrorTypes.Unauthorized,
        title: UnauthorizedErrorTitles.MISSING_CREDENTIALS,
        detail: 'SessionId and predicate address are required',
      });
    }

    const dapp = await DApp.createQueryBuilder('d')
      .innerJoin('d.currentVault', 'currentVault')
      .addSelect(['currentVault.predicateAddress', 'currentVault.id'])
      .innerJoinAndSelect('d.user', 'user')
      .where('d.session_id = :sessionId', {
        sessionId: sessionId.replace('connector', ''),
      })
      .getOne();

    if (!dapp) {
      console.log('Invalid sessionId');
      throw new Unauthorized({
        type: ErrorTypes.Unauthorized,
        title: UnauthorizedErrorTitles.INVALID_CREDENTIALS,
        detail: 'Invalid sessionId',
      });
    }

    if (dapp.user.address !== predicateAddress) {
      console.log('Invalid predicate address for this session');
      throw new Unauthorized({
        type: ErrorTypes.Unauthorized,
        title: UnauthorizedErrorTitles.INVALID_ADDRESS,
        detail: 'Invalid predicate address for this session',
      });
    }

    return {
      user: dapp.user,
      workspace: null,
      network: dapp.network,
      dapp: dapp,
    };
  }
}
