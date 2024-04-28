import { bn } from 'fuels';

import { Asset } from '@src/models';

import { accounts } from '../accounts';

export const ETH_id = '0x000000000000000000000000000000000000000000000000000000';

export const generateInitialAssets = async (): Promise<Partial<Asset>[]> => {
  const asset1: Partial<Asset> = {
    assetId: ETH_id,
    amount: bn(1000).toString(),
    to: accounts['STORE'].address,
  };

  const asset2: Partial<Asset> = {
    assetId: ETH_id,
    amount: bn(100000).toString(),
    to: accounts['STORE'].address,
  };

  return [asset1, asset2];
};
