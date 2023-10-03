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

export const predicateNegativeMinSigners: IPredicatePayload = {
  ...predicate,
  minSigners: -1,
};

export const predicateEmptyAddresses: IPredicatePayload = {
  ...predicate,
  addresses: [],
};

export const predicateDecimalMinSigners: IPredicatePayload = {
  ...predicate,
  minSigners: 2.5,
};

export const predicateStringMinSigners: IPredicatePayload = {
  ...predicate,
  minSigners: ('2' as unknown) as number,
};

export const predicateStringChainId: IPredicatePayload = {
  ...predicate,
  chainId: ('15' as unknown) as number,
};

export const predicateForUpdate: IPredicatePayload = {
  name: 'Roy Mustang',
  predicateAddress:
    '0x0000000000000000000000000000000000000000000000000000000000000123',
  description: 'desc_test',
  minSigners: 2,
  addresses: [],
  owner: '0x0000000000000000000000000000000000000000000000000000000000042069',
  bytes: 'Bytes*#*@&@',
  abi: 'abi#&@&@*',
  configurable: 'configurabled',
  provider: 'network',
  chainId: 12,
};
