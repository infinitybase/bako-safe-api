import { networks } from '@src/tests/mocks/Networks';
import { TypeUser } from 'bakosafe';
import { WalletUnlocked } from 'fuels';

export const newUser = () => {
  const wallet = WalletUnlocked.generate();

  return {
    payload: {
      name: `${new Date().getTime()} - Created User`,
      email: `user-${new Date().getTime()}@example.com`,
      address: wallet.address.toB256(),
      provider: networks['DEVNET'],
      type: TypeUser.FUEL,
    },
    wallet,
  };
};
