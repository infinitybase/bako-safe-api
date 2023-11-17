import {
  Predicate,
  Transaction,
  TransactionStatus,
  User,
  Asset,
  Witness,
} from '@src/models';

import { accounts } from '../accounts';
import { txData } from '../txdata';
import { generateInitialAssets } from './initialAssets';
import { generateInitialWitness } from './initialWitness';

export interface TTI extends Partial<Omit<Transaction, 'assets' | 'witnesses'>> {
  assets: Partial<Asset>[];
  witnesses: Partial<Witness>[];
}
export const generateInitialTransaction = async (): Promise<TTI> => {
  const user = await User.findOne({
    where: {
      address: accounts['USER_1'].address,
    },
  });
  const predicate = await Predicate.findOne({
    order: {
      createdAt: 'ASC',
    },
  });

  const assets = await generateInitialAssets();
  const witnesses = await generateInitialWitness();
  const transaction1: TTI = {
    name: 'fake_name',
    hash: 'fake_hash',
    txData: JSON.parse(txData),
    status: TransactionStatus.SUCCESS,
    sendTime: new Date(),
    gasUsed: 'fake_gasUsed',
    resume: 'fake_resume', //make an type to this
    createdBy: user,
    predicate,
    assets,
    witnesses,
  };

  return transaction1;
};
