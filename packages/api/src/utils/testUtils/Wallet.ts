import { networks } from '@src/mocks/networks';
import { Vault } from 'bakosafe';
import { BN, Provider, Wallet } from 'fuels';

export const txParams = {
  maxFee: 1000,
  gasLimit: 1000,
};

export const sendPredicateCoins = async (
  predicate: Vault,
  amount: BN,
  asset: string,
  rootWallet: string,
) => {
  const wallet = Wallet.fromPrivateKey(rootWallet, new Provider(networks['local']));
  const deposit = await wallet.transfer(predicate.address, amount, asset, txParams);
  await deposit.wait();
};

export const signBypK = async (message: string, privateKey: string) => {
  const provider = new Provider(networks['local']);
  const signer = Wallet.fromPrivateKey(privateKey, provider);
  return signer.signMessage(message);
};
