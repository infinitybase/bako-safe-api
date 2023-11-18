import { bn } from 'fuels';

export const defaultConfigurable = {
  provider: 'http://localhost:4000/graphql',
  gasPrice: bn(1_000_000),
  gasLimit: bn(100000),
  chainId: 0,
};
