import { Vault } from 'bsafe';
import { Address, Provider } from 'fuels';

import { User } from '@src/models';
import { Predicate } from '@src/models/Predicate';

import { accounts } from '../accounts';
import { networks } from '../networks';
import { PredicateMock } from '../predicate';

export const generateInitialPredicate = async (): Promise<Partial<Predicate>> => {
  const pr = await Provider.create(networks['beta4']);
  const owner = await User.findOne({
    where: { address: accounts['USER_1'].address },
  });

  const { predicatePayload } = await PredicateMock.create(1, [owner.address]);

  const members = await User.find({
    take: 3,
    order: {
      createdAt: 'ASC',
    },
  });

  const predicate1: Partial<Predicate> = {
    name: `fake_name: ${new Date().getTime()}`,
    predicateAddress: Address.fromRandom().toString(),
    description: `fake_description: ${new Date().getTime()}`,
    minSigners: 1,
    bytes: predicatePayload.bytes,
    abi: predicatePayload.abi,
    configurable: predicatePayload.configurable,
    provider: predicatePayload.provider,
    chainId: predicatePayload.chainId,
    owner,
    members,
  };

  return predicate1;
};
