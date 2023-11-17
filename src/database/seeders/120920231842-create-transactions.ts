import { generateInitialTransaction } from '@src/mocks/initialSeeds';

import { Transaction } from '@models/index';

export default async function () {
  const existing = (await Transaction.find()).length > 0;

  if (existing) {
    return;
  }
  await Transaction.create(await generateInitialTransaction()).save();
}
