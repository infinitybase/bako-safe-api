import { Predicate } from '@models/index';

export default async function () {
  const predicates: Partial<Predicate>[] = [
    {
      id: '624DA56F-F5E8-4BC2-B3A5-B181FF2B5097',
      name: 'predicate_name',
      predicateAddress:
        'fuel17jy0u3w2cfngtjwfcdrjmcpnushqas6ljvdkekq696m9vdgqhecsmjx7nm',
      abi: 'abi',
      configurable: 'configurable',
      bytes: 'bytes',
      description: 'description',
      minSigners: 3,
      owner_id: 'B8D94EFE-821B-4873-8D4B-A78A57F95BB5',
      provider: 'provider',
      chainId: 2231,
      createdAt: new Date(),
    },
    {
      id: '624DA56F-F5E8-4BC2-B3A5-B181FF2B5098',
      name: 'predicate_name',
      predicateAddress:
        'fuel17jy0u3w2cfngtjwfcdrjmcpnushqas6ljvdkekq696m9vdgqhbcsmjx7nm',
      abi: 'abi',
      configurable: 'configurable',
      bytes: 'bytes',
      description: 'description',
      addresses: JSON.stringify([
        'fuel17jy0u3w2cfngtjwfcdrjmcpnushqas6ljvdkekq696m9vdgqhecsmjx7nm',
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
