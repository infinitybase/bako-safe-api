import { TransactionStatus, Vault } from 'bsafe';
import { bn, Address } from 'fuels';

import { accounts } from '@src/mocks/accounts';
import { assets } from '@src/mocks/assets';
import { sendPredicateCoins } from '@src/utils/testUtils/Wallet';

export const transaction = {
  name: 'Transaction A',
  assets: [
    {
      amount: bn(1_0).format(),
      assetId: assets['ETH'],
      to: accounts['STORE'].address,
    },
  ],
  witnesses: [],
};

export const transactionMock = async (vault: Vault) => {
  await sendPredicateCoins(vault, bn(1_000_0), 'ETH', accounts['FULL'].privateKey);

  const tx = await vault.BSAFEIncludeTransaction(transaction);

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
