import { generateInitialDapp } from '@mocks/initialSeeds';

import { DApp } from '@src/models';

export default async function () {
  const existing = (await DApp.find()).length > 0;

  if (existing) {
    return;
  }
  await DApp.create(await generateInitialDapp()).save();
}
