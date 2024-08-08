import { generateWitnessesUpdatedAt } from '@src/utils/witnessesUpdatedAt';
import { accounts } from '../accounts';
import { IWitnesses, WitnessStatus } from 'bakosafe';

export const generateInitialWitness = async (): Promise<IWitnesses[]> => {
  const w1: IWitnesses = {
    signature: null,
    account: accounts['USER_1'].address,
    status: WitnessStatus.PENDING,
    updatedAt: generateWitnessesUpdatedAt(),
  };

  const w2: IWitnesses = {
    signature: null,
    account: accounts['USER_1'].address,
    status: WitnessStatus.PENDING,
    updatedAt: generateWitnessesUpdatedAt(),
  };

  return [w1, w2];
};
