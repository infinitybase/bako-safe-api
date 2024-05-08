import { BakoSafe, defaultConfig, Vault } from 'bakosafe';
import { BN, Wallet, Provider, bn } from 'fuels';

import { assets } from '@src/mocks/assets';

export const txParams = {
  gasPrice: BakoSafe.getChainConfig('GAS_PRICE'),
  gasLimit: BakoSafe.getChainConfig('GAS_LIMIT'),
};

export const sendPredicateCoins = async (
  predicate: Vault,
  amount: BN,
  asset: 'ETH' | 'DAI' | 'sETH',
  rootWallet: string,
) => {
  const wallet = Wallet.fromPrivateKey(
    rootWallet,
    await Provider.create(BakoSafe.get('PROVIDER')),
  );
  // console.log(
  //   '[ROOT_BALANCE]: ',
  //   (await wallet.getBalance(assets[asset])).toString(),
  // );
  const deposit = await wallet.transfer(
    predicate.address,
    amount,
    assets[asset],
    txParams,
  );
  await deposit.wait();
};

export const signBypK = async (message: string, privateKey: string) => {
  const provider = await Provider.create(BakoSafe.get('PROVIDER'));
  const signer = Wallet.fromPrivateKey(privateKey, provider);
  return signer.signMessage(message);
};
