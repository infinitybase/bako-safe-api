import { Transaction } from '@models/index';

export default async function () {
  const transactions: Partial<Transaction>[] = [
    {
      id: 'F4082213-EB62-4D8C-B81F-3C71BE7FE7B2',
      name: 'transaction_name',
      predicateAdress: 'predicate_adress',
      predicateID: '624da56f-f5e8-4bc2-b3a5-b181ff2b5097',
      txData: 'txData',
      hash: 'hash',
      status: 'status',
      sendTime: new Date(),
      gasUsed: 'gasUsed',
      resume: 'resume',
      createdAt: new Date(),
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
