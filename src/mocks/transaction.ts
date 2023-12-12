import { bn } from 'fuels';

import { accounts } from '@src/mocks/accounts';
import { assets } from '@src/mocks/assets';

export const transaction = {
  name: 'Transaction A',
  assets: [
    {
      amount: bn(1_000).format(),
      assetId: assets['ETH'],
      to: accounts['STORE'].address,
    },
  ],
  witnesses: [],
};
