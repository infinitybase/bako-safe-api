import { Witness } from '@models/index';

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

  if (existingAssets.length) return;

  for await (const witness of witnesses) {
    await Witness.create(witness).save();
  }
}
