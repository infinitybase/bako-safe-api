import { defaultConfig as conf } from 'bako-safe';

export const defaultConfigurable = {
  provider: conf['PROVIDER'],
  gasPrice: conf['GAS_PRICE'],
  gasLimit: conf['GAS_LIMIT'],
  chainId: 0, // todo: make this dynamic
};
