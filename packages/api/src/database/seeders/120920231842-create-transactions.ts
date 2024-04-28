import { generateInitialTransaction } from '@src/mocks/initialSeeds';

import { Transaction } from '@models/index';

export default async function () {
  await Transaction.create(await generateInitialTransaction()).save();
}
