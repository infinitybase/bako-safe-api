import { addMinutes } from 'date-fns';

import { RecoverCodeType } from '@src/models';
import { bindMethods, Responses, successful } from '@utils/index';
import { error } from '@utils/error';

import { ICreateRecoverCodeRequest } from './types';
import { RecoverCodeService } from './services';

export class RecoverCodeController {
  async generateRecoverCode(req: ICreateRecoverCodeRequest) {
    try {
      const { dapp } = req;

      if (!dapp) {
        throw new Error('DApp not found');
      }

      const recoverCodeService = new RecoverCodeService();
      const code = await recoverCodeService.create({
        owner: dapp.user,
        type: RecoverCodeType.AUTH_ONCE,
        origin: dapp.origin,
        validAt: addMinutes(new Date(), 5),
        metadata: {
          uses: 0,
          dappId: dapp.id,
          sessionId: dapp.sessionId,
        },
        network: dapp.network,
      });

      return successful(
        {
          code: code.code,
          validAt: code.validAt,
          metadata: code.metadata,
        },
        Responses.Created,
      );
    } catch (e) {
      return error(e, 400);
    }
  }
}
