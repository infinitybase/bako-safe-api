import { AuthService } from '@src/modules/auth/services';
import { DAppsService } from '@src/modules/dApps';
import { PredicateService } from '@src/modules/predicate/services';

import { ISocketEvent, SocketEvents } from './types';

export interface IEventsExecute {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: (socket: any, event: ISocketEvent) => void;
}
export const popAuth: IEventsExecute = {
  [SocketEvents.AUTH_CONFIRMED]: async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket: any,
    { content, to }: ISocketEvent,
  ) => {
    try {
      const { vaultId, sessionId, name, origin } = content;
      const predicate = await new PredicateService().findById(vaultId);
      //const origin = socket.handshake.headers.origin;
      let dapp = await new DAppsService().findBySessionID(sessionId, origin);
      const room = `${sessionId}:${origin}`;

      if (!dapp) {
        dapp = await new DAppsService().create({
          sessionId,
          name: name ?? ``,
          origin,
          vaults: [predicate],
          currentVault: predicate,
        });
      }
      const isIncludedVault = dapp.vaults.find(v => v.id === vaultId);
      if (!isIncludedVault) {
        dapp.vaults = [...dapp.vaults, predicate];
        dapp.currentVault = predicate;

        await dapp.save();
      }

      socket.to(room).emit('message', {
        type: 'connection',
        data: [true],
      });
      socket.to(room).emit('message', {
        type: 'accounts',
        data: [dapp?.vaults.map(v => v.predicateAddress)],
      });
      socket.to(room).emit('message', {
        type: 'currentAccount',
        data: [dapp?.currentVault.predicateAddress],
      });
      return;
    } catch (e) {
      console.log(e);
    }
  },

  [SocketEvents.TRANSACTION_APPROVED]: async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket: any,
    { content, to }: ISocketEvent,
  ) => {
    console.log('[TRANSACTION_APPROVED]: ', content, to);
  },
};
