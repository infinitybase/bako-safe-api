import { AuthService } from '@src/modules/auth/services';

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
    const { address } = content;
    const { token } = await new AuthService().findToken({
      address,
      notExpired: true,
    });

    socket.to(to).emit(SocketEvents.AUTH_CONFIRMED, {
      ...content,
      BSAFEAuth: { token, address },
    });

    console.log('[CHEGOU]: ', content);
    console.log('[SAIU]: ', {
      ...content,
      BSAFEAuth: { token, address },
    });
  },
  [SocketEvents.TRANSACTION_APPROVED]: async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket: any,
    { content, to }: ISocketEvent,
  ) => {
    console.log('[TRANSACTION_APPROVED]: ', content, to);
  },
};
