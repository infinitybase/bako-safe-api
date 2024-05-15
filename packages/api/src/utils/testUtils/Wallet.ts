import { BakoSafe, Vault } from 'bakosafe';
import { BN, Wallet, Provider, bn } from 'fuels';

import { assets } from '@src/mocks/assets';

export const txParams = {
  gasPrice: BakoSafe.getGasConfig('GAS_PRICE'),
  gasLimit: BakoSafe.getGasConfig('GAS_LIMIT'),
};

export const sendPredicateCoins = async (
  predicate: Vault,
  amount: BN,
  asset: 'ETH' | 'DAI' | 'sETH',
  rootWallet: string,
) => {
  const wallet = Wallet.fromPrivateKey(
    rootWallet,
    await Provider.create(BakoSafe.getProviders('CHAIN_URL')),
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
  const provider = await Provider.create(BakoSafe.getProviders('CHAIN_URL'));
  const signer = Wallet.fromPrivateKey(privateKey, provider);
  return signer.signMessage(message);
};
