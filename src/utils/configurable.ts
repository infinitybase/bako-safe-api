import { defaultConfig as conf } from 'bsafe';

export const defaultConfigurable = {
  provider: conf['provider'],
  gasPrice: conf['gasPrice'],
  gasLimit: conf['gasLimit'],
  chainId: conf['chainId'],
};
