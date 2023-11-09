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
    const { origin, vaultId, sessionId } = content;
    const predicate = await new PredicateService().findById(vaultId);
    await new DAppsService().create({
      origin,
      sessionId,
      vaults: [predicate],
    });

    socket.to(`${origin}:${sessionId}`).emit('message', {
      type: 'connection',
      data: [true],
    });
    socket.to(`${origin}:${sessionId}`).emit('message', {
      type: 'accounts',
      data: [[predicate.predicateAddress]],
    });
    socket.to(`${origin}:${sessionId}`).emit('message', {
      type: 'currentAccount',
      data: [predicate.predicateAddress],
    });

    console.log('[CHEGOU]: ', content);
  },
  [SocketEvents.TRANSACTION_APPROVED]: async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket: any,
    { content, to }: ISocketEvent,
  ) => {
    console.log('[TRANSACTION_APPROVED]: ', content, to);
  },
};
