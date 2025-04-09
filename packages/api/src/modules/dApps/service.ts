import { DApp } from '@src/models';
import { ErrorTypes, NotFound } from '@src/utils/error';
import Internal from '@src/utils/error/Internal';
import { RedisReadClient, RedisWriteClient } from '@src/utils';
import { IDAPPChangeNetwork, IDAPPCreatePayload, IDAppsService } from './types';
import { DeepPartial } from 'typeorm';

export class DAppsService implements IDAppsService {
  async create(params: IDAPPCreatePayload) {
    const partialPayload: DeepPartial<DApp> = params;
    return await DApp.create(partialPayload)
      .save()
      .then(() => this.findLast())
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
      .innerJoinAndSelect('d.user', 'user')
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

  async findCurrent(sessionID: string) {
    return await DApp.createQueryBuilder('d')
      .select()
      .innerJoin('d.currentVault', 'currentVault')
      .addSelect(['currentVault.predicateAddress', 'currentVault.id'])
      .where('d.session_id = :sessionID', { sessionID })
      .getOne()
      .then(data => data?.currentVault.id ?? undefined)
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on find current to dapp',
          detail: e,
        });
      });
  }

  async findLast() {
    try {
      return await DApp.createQueryBuilder('d')
        .select()
        .innerJoinAndSelect('d.vaults', 'vaults')
        .innerJoinAndSelect('d.currentVault', 'currentVault')
        .orderBy('d.createdAt', 'DESC')
        .getOne();
    } catch (e) {
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on find last dapp',
        detail: e,
      });
    }
  }

  async findDAppUserBySessionIdAndOrigin(sessionId: string, origin: string) {
    try {
      return await DApp.createQueryBuilder('d')
        .innerJoin('d.user', 'user')
        .addSelect(['user.id'])
        .where('d.session_id = :sessionId', { sessionId })
        .andWhere('d.origin = :origin', { origin })
        .getOne();
    } catch (e) {
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on find user by session id and origin',
        detail: e,
      });
    }
  }

  async updateNetwork(payload: IDAPPChangeNetwork) {
    const { sessionId, newNetwork, origin } = payload;

    return await this.findBySessionID(sessionId, origin).then(async dapp => {
      if (!dapp) {
        throw new NotFound({
          type: ErrorTypes.NotFound,
          title: 'DApp not found',
          detail: `No dapp was found for these sessionID or origin.`,
        });
      }
      dapp.network = newNetwork;
      await dapp.save();
      return dapp.network;
    });
  }
}
