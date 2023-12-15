import { defaultConfigurable as conf } from 'bsafe';
import { bn } from 'fuels';

export const defaultConfigurable = {
  provider: conf['provider'],
  gasPrice: conf['gasPrice'],
  gasLimit: conf['gasLimit'],
  chainId: conf['chainId'],
};
