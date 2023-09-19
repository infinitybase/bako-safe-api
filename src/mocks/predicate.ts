import { IPredicatePayload } from '@src/modules/predicate/types';

export const predicate: IPredicatePayload = {
  name: 'Testing',
  predicateAddress:
    '0x0000000000000000000000000000000000000000000000000000000000000000',
  description: 'desc_test',
  minSigners: 3,
  addresses: [
    '0x0000000000000000000000000000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000000000000000000000000000',
  ],
  owner: '0x0000000000000000000000000000000000000000000000000000000000000000',
  bytes: 'bytes',
  abi: 'abi',
  configurable: 'configurable',
  provider: 'network',
  chainId: 1,
};
