import { bn } from 'fuels';

import { IAsset } from '@src/modules/transaction/types';

import { accounts } from '../accounts';

export const ETH_id = '0x000000000000000000000000000000000000000000000000000000';

export const generateInitialAssets = async (): Promise<Partial<IAsset>[]> => {
  const asset1: Partial<IAsset> = {
    assetId: ETH_id,
    amount: bn(1000).toString(),
    to: accounts['STORE'].address,
  };

  const asset2: Partial<IAsset> = {
    assetId: ETH_id,
    amount: bn(100000).toString(),
    to: accounts['STORE'].address,
  };

  return [asset1, asset2];
};
