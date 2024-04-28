import { Witness, WitnessesStatus } from '@src/models';

import { accounts } from '../accounts';

export const generateInitialWitness = async (): Promise<Partial<Witness>[]> => {
  const w1: Partial<Witness> = {
    signature: null,
    account: accounts['USER_1'].address,
    status: WitnessesStatus.PENDING,
  };

  const w2: Partial<Witness> = {
    signature: null,
    account: accounts['USER_1'].address,
    status: WitnessesStatus.PENDING,
  };

  return [w1, w2];
};
