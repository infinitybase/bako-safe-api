import { RecoverCode } from '@models/index';

import { ErrorTypes } from '@utils/error/GeneralError';
import Internal from '@utils/error/Internal';

import { IRecoverCodeService, ICreateRecoverCodePayload } from './types';

export class RecoverCodeService implements IRecoverCodeService {
  async create(paylaod: ICreateRecoverCodePayload) {
    return RecoverCode.create(paylaod)
      .save()
      .then(data => data)
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Create,
          title: 'Error on recover code create',
          detail: e,
        });
      });
  }

  async update(id: string, payload: Partial<RecoverCode>) {
    const recoverCode = Object.assign(await RecoverCode.findOne({ id }), payload);
    return recoverCode
      .save()
      .then(async () => {
        return await RecoverCode.findOne({ id });
      })
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Update,
          title: 'Error on recover code update',
          detail: e,
        });
      });
  }

  async findByCode(code: string) {
    return RecoverCode.findOne({ where: { code } })
      .then(data => data)
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on recover code find',
          detail: e,
        });
      });
  }
}
