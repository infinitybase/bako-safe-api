import { TransactionStatus } from 'bsafe';

import { Predicate, Transaction, User, Asset, Witness } from '@src/models';

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
    status: TransactionStatus.AWAIT_REQUIREMENTS,
    sendTime: new Date(),
    gasUsed: 'fake_gasUsed',
    resume: {
      status: TransactionStatus.AWAIT_REQUIREMENTS,
      predicate: {
        id: predicate.id,
        address: predicate.predicateAddress,
      },
      totalSigners: 0,
      requiredSigners: 0,
      outputs: [],
      hash: 'fake_hash',
    },
    createdBy: user,
    predicate,
    assets,
    witnesses,
  };

  return transaction1;
};
