import { Predicate } from '@models/index';

export default async function () {
  const predicates: Partial<Predicate>[] = [
    {
      name: 'predicate_name',
      address: '8CAD6FD8-1CB9-41CD-9862-BB14ABDD27E4',
      abi: 'abi',
      configurable: 'configurable',
      bytes: 'bytes',
      description: 'description',
      addresses: ['asjdhakjsdhas', 'asjdghajdhsgasd'],
      minSigners: 3,
      owner: 'owner',
      network: 'network',
      chainId: 2231,
    },
  ];

  const existingPredicates = await Predicate.find({
    where: [{ address: predicates[0].address }, { abi: predicates[0].abi }],
  });

  if (existingPredicates.length) {
    return;
  }

  for await (const predicate of predicates) {
    await Predicate.create(predicate).save();
  }
}
