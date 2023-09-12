import { Witness } from '@models/index';

export default async function () {
  const witnesses: Partial<Witness>[] = [
    {
      transactionID: 1,
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
