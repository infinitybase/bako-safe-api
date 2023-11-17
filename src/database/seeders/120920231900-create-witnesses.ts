import { Transaction, Witness } from '@models/index';

export default async function () {
  const witnesses: Partial<Witness>[] = [
    {
      transactionID: 'F4082213-EB62-4D8C-B81F-3C71BE7FE7B2',
      account: 'fuel..asdaa37yf',
      signature: 'asduyhxNORX8T2XRX3NWUS',
    },
  ];

  const existingAssets = await Witness.find({
    where: [
      { account: witnesses[0].account },
      { signature: witnesses[0].signature },
    ],
  });

  const transaction = await Transaction.find();
  const transaction_id = await transaction[0].id;

  if (existingAssets.length) return;

  for await (const witness of witnesses) {
    await Witness.create({
      ...witness,
      transactionID: transaction_id,
    }).save();
  }
}
