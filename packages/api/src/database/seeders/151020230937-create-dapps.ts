import { generateInitialDapp } from '@mocks/initialSeeds';

import { DApp } from '@src/models';

export default async function () {
  await DApp.create(await generateInitialDapp()).save();
}
