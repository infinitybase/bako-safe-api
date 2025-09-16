import { launchTestNode } from 'fuels/test-utils';
import { assets } from './Assets';
import { deployPredicate } from './Predicate';

export const networks = {
  DEVNET: 'https://testnet.fuel.network/v1/graphql',
  LOCAL: 'http://127.0.0.1:4000/v1/graphql',
  MAINNET: 'https://mainnet.fuel.network/v1/graphql',
};

export const generateNode = async () => {
  const node = await launchTestNode({
    walletsConfig: {
      assets: assets(),
      coinsPerAsset: 1,
      amountPerCoin: 10_000_000_000,
    },
    nodeOptions: {
      killProcessOnExit: true,
    },
  });

  const wallet = node.wallets[0];
  console.log('####WALLET', wallet);
  await deployPredicate(wallet);

  return {
    node,
    provider: node.provider,
    url: node.provider.url,
  };
};
