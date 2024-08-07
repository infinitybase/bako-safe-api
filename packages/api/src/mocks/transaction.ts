import { BakoSafe, TransactionStatus, Vault } from 'bakosafe';
import { bn, Address, Provider } from 'fuels';

import { accounts } from '@src/mocks/accounts';

import { sendPredicateCoins } from '@src/utils/testUtils/Wallet';
import { assetsMapBySymbol } from '@src/utils/assets';

export const transaction = {
  name: 'Transaction A',
  assets: [
    {
      amount: '0.0001',
      assetId: assetsMapBySymbol['ETH'].id,
      to: accounts['STORE'].address,
    },
  ],
  witnesses: [],
};

export const transactionMock = async (vault: Vault) => {
  const provider = await Provider.create(BakoSafe.getProviders('CHAIN_URL'));
  await sendPredicateCoins(
    vault,
    bn.parseUnits('0.5'),
    provider.getBaseAssetId(),
    accounts['FULL'].privateKey,
  );

  const tx = await vault.BakoSafeIncludeTransaction(transaction);

  const payload_transfer = {
    predicateAddress: vault.address.toString(),
    name: `[TESTE_MOCK] ${Address.fromRandom().toString()}`,
    hash: tx.getHashTxId(),
    txData: tx.transactionRequest,
    status: TransactionStatus.AWAIT_REQUIREMENTS,
    assets: transaction.assets,
  };

  return { tx, payload_transfer };
};
