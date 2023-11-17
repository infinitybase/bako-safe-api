import { txData } from '@src/mocks/txdata';

import { Asset, Transaction, TransactionStatus } from '@models/index';

export default async function () {
  const transactions: Partial<Transaction>[] = [
    {
      name: 'transaction_name',
      predicateAddress: 'predicate_adress',
      predicateID: '624da56f-f5e8-4bc2-b3a5-b181ff2b5097',
      txData: JSON.parse(txData),
      hash: 'hash',
      status: TransactionStatus.AWAIT_REQUIREMENTS,
      sendTime: new Date(),
      gasUsed: 'gasUsed',
      resume: 'resume',
      createdAt: new Date(),
      assets: [
        Asset.create({
          assetId: '0x000000000000000000000000000000000000000000000000000000',
          amount: '0.0000001',
          to: 'kajsakhksdhasda',
          utxo: 'utxo',
        }),
      ],
    },
  ];

  const existingTransactions = await Transaction.find({
    where: [{ hash: transactions[0].hash }, { name: transactions[0].name }],
  });

  if (existingTransactions.length) return;
  for await (const transaction of transactions) {
    await Transaction.create(transaction).save();
  }
}
