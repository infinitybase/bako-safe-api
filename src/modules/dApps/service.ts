import { DApp } from '@src/models';
import { ErrorTypes } from '@src/utils/error';
import Internal from '@src/utils/error/Internal';

import { IDAPPCreatePayload, IDAppsService } from './types';

export class DAppsService implements IDAppsService {
  async create({ sessionId, name, url, users }: IDAPPCreatePayload) {
    return await DApp.create({ sessionId, name, url, users: [users] })
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

  async findBySessionID(sessionID: string) {
    return await DApp.createQueryBuilder('d')
      .innerJoin('d.users', 'users')
      .addSelect(['users.id', 'users.address', 'users.avatar'])
      .where('d.session_id = :sessionID', { sessionID })
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

  async checkExist(address: string, sessionId, url: string) {
    return await DApp.createQueryBuilder('d')
      .innerJoin('d.users', 'users')
      .where('users.address = :address', { address })
      .andWhere('d.session_id = :sessionId', { sessionId })
      .andWhere('d.url = :url', { url })
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
}
