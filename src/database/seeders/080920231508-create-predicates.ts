import { defaultValues } from 'bsafe';

import { Predicate } from '@models/index';

export default async function () {
  const predicates: Partial<Predicate>[] = [
    {
      id: '624DA56F-F5E8-4BC2-B3A5-B181FF2B5097',
      name: 'predicate_name',
      predicateAddress: defaultValues['address'],
      abi: 'abi',
      configurable: 'configurable',
      bytes: 'bytes',
      description: 'description',
      addresses: JSON.stringify([
        defaultValues['address'],
        defaultValues['address'],
      ]),
      minSigners: 3,
      owner: 'owner',
      provider: 'provider',
      chainId: 2231,
      createdAt: new Date(),
    },
  ];

  const existingPredicates = await Predicate.find({
    where: [
      { predicateAddress: predicates[0].predicateAddress },
      { abi: predicates[0].abi },
    ],
  });

  if (existingPredicates.length) {
    return;
  }

  for await (const predicate of predicates) {
    await Predicate.create(predicate).save();
  }
}
