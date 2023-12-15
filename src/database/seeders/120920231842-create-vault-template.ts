import { generateInitialTemplate } from '@mocks/initialSeeds';

import VaultTemplate from '@src/models/VaultTemplate';

export default async function () {
  const existing = (await VaultTemplate.find()).length > 0;

  if (existing) {
    return;
  }
  await VaultTemplate.create(await generateInitialTemplate()).save();
}
