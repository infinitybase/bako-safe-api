import { DApp } from '@src/models';
import { ErrorTypes } from '@src/utils/error';
import Internal from '@src/utils/error/Internal';

import { IDAPPCreatePayload, IDAppsService } from './types';

export class DAppsService implements IDAppsService {
  async create({
    sessionId,
    name,
    origin,
    vaults,
    currentVault,
  }: IDAPPCreatePayload) {
    return await DApp.create({
      sessionId,
      name,
      origin,
      vaults: vaults,
      currentVault,
    })
      .save()
      .then(data => data)
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on create dapp',
          detail: e,
        });
      });
  }

  async findBySessionID(sessionID: string, origin: string) {
    return await DApp.createQueryBuilder('d')
      .innerJoin('d.vaults', 'vaults')
      .addSelect(['vaults.predicateAddress', 'vaults.id'])
      .innerJoin('d.currentVault', 'currentVault')
      .addSelect(['currentVault.predicateAddress', 'currentVault.id'])
      .where('d.session_id = :sessionID', { sessionID })
      .andWhere('d.origin = :origin', { origin })
      .getOne()
      .then(data => data)
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on find active sessions to dapp',
          detail: e,
        });
      });
  }

  async delete(sessionId: string, origin: string) {
    return await DApp.delete({ sessionId, origin });
  }
  // async checkExist(address: string, sessionId, url: string) {
  //   return await DApp.createQueryBuilder('d')
  //     .innerJoin('d.users', 'users')
  //     .where('users.address = :address', { address })
  //     .andWhere('d.session_id = :sessionId', { sessionId })
  //     .andWhere('d.url = :url', { url })
  //     .getOne()
  //     .then(data => data)
  //     .catch(e => {
  //       throw new Internal({
  //         type: ErrorTypes.Internal,
  //         title: 'Error on find active sessions to dapp',
  //         detail: e,
  //       });
  //     });
  // }
}
