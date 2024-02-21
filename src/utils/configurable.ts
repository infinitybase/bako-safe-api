import { defaultConfig as conf } from 'bsafe';

export const defaultConfigurable = {
  provider: conf['PROVIDER'],
  gasPrice: conf['GAS_PRICE'],
  gasLimit: conf['GAS_LIMIT'],
  chainId: conf['chainId'],
};
