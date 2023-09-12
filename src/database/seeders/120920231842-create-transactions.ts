import { Transaction } from '@models/index';

export default async function () {
  const transactions: Partial<Transaction>[] = [
    {
      name: 'transaction_name',
      predicateAdress: 'predicate_adress',
      predicateID: 1,
      txData: 'txData',
      hash: 'hash',
      status: 'status',
      sendTime: new Date(),
      gasUsed: 'gasUsed',
      resume: 'resume',
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
