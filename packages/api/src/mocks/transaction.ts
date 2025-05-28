import { TransactionStatus, Vault } from 'bakosafe';
import { bn, Address } from 'fuels';

import { accounts } from '@src/mocks/accounts';

import { sendPredicateCoins } from '@src/utils/testUtils/Wallet';
//import { assetsMapBySymbol } from '@src/utils/assets';
import { txData } from './txdata';
import { FuelProvider } from '@src/utils';
import { tokensIDS } from '@src/utils/assets-token/addresses';

const { FUEL_PROVIDER } = process.env;

export const transaction = {
  name: 'Transaction A',
  assets: [
    {
      amount: '0.0001',
      assetId: tokensIDS.ETH, //assetsMapBySymbol['ETH'].id,
      to: accounts['STORE'].address,
    },
  ],
  witnesses: [],
};

export const transactionMock = async (vault: Vault) => {
  //const provider = await Provider.create(BakoSafe.getProviders('CHAIN_URL'));
  const provider = await FuelProvider.create(FUEL_PROVIDER);

  console.log('>>> provider base asset id', await provider.getBaseAssetId());
  await sendPredicateCoins(
    vault,
    bn.parseUnits('0.5'),
    await provider.getBaseAssetId(),
    accounts['FULL'].privateKey,
  );

  //const tx = await vault.BakoSafeIncludeTransaction(transaction);
  const tx = JSON.parse(txData);
  const _tx = await vault.BakoTransfer(tx);

  const payload_transfer = {
    predicateAddress: vault.address.toString(),
    name: `[TESTE_MOCK] ${Address.fromRandom().toString()}`,
    hash: _tx.hashTxId,
    txData: _tx, //tx.transactionRequest,
    status: TransactionStatus.AWAIT_REQUIREMENTS,
    assets: transaction.assets,
  };

  return { tx, payload_transfer };
};
