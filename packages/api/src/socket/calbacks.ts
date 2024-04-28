import { BakoSafeConnectors } from 'bakosafe';

import { Transaction } from '@src/models';
import { DAppsService } from '@src/modules/dApps';
import { PredicateService } from '@src/modules/predicate/services';

import { ISocketEvent } from './types';

export interface IEventsExecute {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: (socket: any, event: ISocketEvent) => void;
}
export const popAuth: IEventsExecute = {
  [BakoSafeConnectors.AUTH_CONFIRMED]: async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket: any,
    { content }: ISocketEvent,
  ) => {
    try {
      const { vaultId, sessionId, name, origin } = content;
      const predicate = await new PredicateService().findById(vaultId);
      let dapp = await new DAppsService().findBySessionID(sessionId, origin);
      const room = `${sessionId}:${origin}`;

      if (!dapp) {
        dapp = await new DAppsService().create({
          sessionId,
          name: name ?? ``,
          origin,
          vaults: [predicate],
          currentVault: predicate,
          user: dapp.user,
        });
      }
      const isIncludedVault = dapp.vaults.find(v => v.id === vaultId);
      if (!isIncludedVault) {
        dapp.vaults = [...dapp.vaults, predicate];
      }

      dapp.currentVault = predicate;
      await dapp.save();

      socket.to(room).emit(BakoSafeConnectors.DEFAULT, {
        type: BakoSafeConnectors.CONNECTION,
        data: [true],
      });
      socket.to(room).emit(BakoSafeConnectors.DEFAULT, {
        type: BakoSafeConnectors.CURRENT_ACCOUNT,
        data: [predicate.predicateAddress],
      });
      socket.to(room).emit(BakoSafeConnectors.DEFAULT, {
        type: BakoSafeConnectors.CONNECTED_NETWORK,
        data: [predicate.provider],
      });
      socket.to(room).emit(BakoSafeConnectors.DEFAULT, {
        type: BakoSafeConnectors.ACCOUNTS,
        data: [dapp?.vaults.map(v => v.predicateAddress)],
      });
    } catch (e) {
      console.log('[AUTH_CONFIRMED]: ERRO', e);
    }

    return;
  },

  [BakoSafeConnectors.TRANSACTION_SEND]: async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket: any,
    { content, to }: ISocketEvent,
  ) => {
    socket.to(to).emit(BakoSafeConnectors.DEFAULT, {
      type: BakoSafeConnectors.TRANSACTION_SEND,
      data: content,
    });
  },

  //todo: typing all items
  [BakoSafeConnectors.TRANSACTION_CREATED]: async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket: any,
    { content, to }: ISocketEvent,
  ) => {
    // add sumary on transaction
    const { sessionId, origin, operations } = content;
    await Transaction.findOne({
      where: { hash: content.hash },
    }).then(async (data: Transaction) => {
      const session = await new DAppsService().findBySessionID(sessionId, origin);
      if (session) {
        data.summary = {
          origin: session.origin,
          name: session.name,
          image: '',
          operations,
        };
        await data.save();
      }
    });
    socket.to(to).emit(BakoSafeConnectors.DEFAULT, {
      type: BakoSafeConnectors.TRANSACTION_CREATED,
      data: [content.hash],
    });
  },

  //todo: typing all items
  [BakoSafeConnectors.AUTH_DISCONECT_DAPP]: async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket: any,
    { content }: ISocketEvent,
  ) => {
    const { sessionId } = content;
    const origin = socket.handshake.headers.origin;
    await new DAppsService().delete(sessionId, origin);
  },
};
