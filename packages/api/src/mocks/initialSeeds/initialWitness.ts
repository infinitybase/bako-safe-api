import { IWitness, WitnessesStatus } from '@src/modules/transaction/types';

import { accounts } from '../accounts';

export const generateInitialWitness = async (): Promise<IWitness[]> => {
  const w1: IWitness = {
    signature: null,
    account: accounts['USER_1'].address,
    status: WitnessesStatus.PENDING,
  };

  const w2: IWitness = {
    signature: null,
    account: accounts['USER_1'].address,
    status: WitnessesStatus.PENDING,
  };

  return [w1, w2];
};
