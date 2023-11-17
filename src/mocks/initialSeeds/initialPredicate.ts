import { Address, Provider } from 'fuels';

import { User } from '@src/models';
import { Predicate } from '@src/models/Predicate';

import { accounts } from '../accounts';
import { networks } from '../networks';

export const generateInitialPredicate = async (): Promise<Partial<Predicate>> => {
  const pr = await Provider.create(networks['local']);
  const owner = await User.findOne({
    where: { address: accounts['USER_1'].address },
  });

  const members = await User.find({
    take: 3,
    order: {
      createdAt: 'ASC',
    },
  });

  const predicate1: Partial<Predicate> = {
    name: 'fake_name',
    predicateAddress: Address.fromRandom().toString(),
    description: 'fake_description',
    minSigners: 2,
    bytes: 'fake_bytes',
    abi: 'fake_abi',
    configurable: 'fake_configurable',
    provider: pr.url,
    chainId: pr.getChainId(),
    owner,
    members,
  };

  return predicate1;
};
