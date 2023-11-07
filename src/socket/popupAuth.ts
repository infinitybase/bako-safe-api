import { AuthService } from '@src/modules/auth/services';

import {
  IAuthEventType,
  ISocketEvent,
  SocketChannels,
  IWalletEventType,
} from './types';

export interface IEventsExecute {
  [key: string]: (socket: any, event: ISocketEvent) => void;
}
export const popAuth: IEventsExecute = {
  [IAuthEventType.VAULT_SECTED]: async (
    socket: any,
    { content, to }: ISocketEvent,
  ) => {
    const { address } = content;
    const { token } = await new AuthService().findToken({
      address,
      notExpired: true,
    });
    console.log('[CHEGOU]: ', content);
    console.log('[SAIU]: ', {
      ...content,
      type: IWalletEventType.SET_CURRENT_VAULT,
      BSAFEAuth: { token, address },
    });
    socket.to(to).emit(SocketChannels.WALLET, {
      ...content,
      type: IWalletEventType.SET_CURRENT_VAULT,
      BSAFEAuth: { token, address },
    });
  },
};
