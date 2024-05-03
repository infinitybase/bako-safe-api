import { Address } from 'fuels';
import { In } from 'typeorm';

import { PredicateVersion, User } from '@src/models';
import { Predicate } from '@src/models/Predicate';

import { PredicateMock } from '../predicate';
import { generateInitialUsers } from './initialUsers';
import { predicateVersionMock } from '../predicateVersion';

export const generateInitialPredicate = async (): Promise<Partial<Predicate>> => {
  const users = (await generateInitialUsers()).map(u => u.name);

  const owner = await User.findOne({
    where: { name: users[0] },
  });
  const { predicatePayload } = await PredicateMock.create(1, [owner.address]);
  const members = await User.find({
    take: 3,
    where: {
      name: In(users),
    },
  });
  const version = await PredicateVersion.findOne({
    rootAddress: predicateVersionMock.rootAddress,
  });

  const predicate1: Partial<Predicate> = {
    name: `fake_name: ${members[0].name}`,
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
    version,
    createdAt: new Date(),
  };

  return predicate1;
};
