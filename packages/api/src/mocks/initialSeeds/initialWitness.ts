import { accounts } from '../accounts';
import { IWitnesses, WitnessStatus } from 'bakosafe';

export const generateInitialWitness = async (): Promise<IWitnesses[]> => {
  const w1: IWitnesses = {
    signature: null,
    account: accounts['USER_1'].address,
    status: WitnessStatus.PENDING,
  };

  const w2: IWitnesses = {
    signature: null,
    account: accounts['USER_1'].address,
    status: WitnessStatus.PENDING,
  };

  return [w1, w2];
};
