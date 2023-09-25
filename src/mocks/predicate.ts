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
  name: '123',
  predicateAddress:
    '0x0000000000000000000000000000000000000000000000000000000000000001',
  description: 'desc_test',
  minSigners: -1,
  addresses: [
    '0x0000000000000000000000000000000000000000000000000000000000000002',
    '0x0000000000000000000000000000000000000000000000000000000000000003',
  ],
  owner: '0x0000000000000000000000000000000000000000000000000000000000007654',
  bytes: 'Bytes*#*@&@',
  abi: 'abi#&@&@*',
  configurable: 'configurable',
  provider: 'network',
  chainId: 12,
};
export const predicateNullAddress: IPredicatePayload = {
  name: 'Alberto Felchado',
  predicateAddress:
    '0x0000000000000000000000000000000000000000000000000000000000000001',
  description: 'desc_test',
  minSigners: -1,
  addresses: [null],
  owner: '0x0000000000000000000000000000000000000000000000000000000000007654',
  bytes: 'Bytes*#*@&@',
  abi: 'abi#&@&@*',
  configurable: 'configurable',
  provider: 'network',
  chainId: 12,
};
export const predicateMinSignersNotInter: IPredicatePayload = {
  name: 'Roy Mustang',
  predicateAddress:
    '0x0000000000000000000000000000000000000000000000000000000000000001',
  description: 'desc_test',
  minSigners: 2.5,
  addresses: [],
  owner: '0x0000000000000000000000000000000000000000000000000000000000007654',
  bytes: 'Bytes*#*@&@',
  abi: 'abi#&@&@*',
  configurable: 'configurable',
  provider: 'network',
  chainId: 12,
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
export const wrongPredicate: IPredicatePayload = {
  name: 'Apagado',
  predicateAddress:
    '0x0000000000000000000000000000000000000000000000000000000000000001',
  description: 'desc_test',
  minSigners: -1,
  addresses: [],
  owner: '0x0000000000000000000000000000000000000000000000000000000000007777',
  bytes: 'Bytes*#*@&@',
  abi: 'abi#&@&@*',
  configurable: 'configurable',
  provider: 'network',
  chainId: -512312,
};
