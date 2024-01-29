import { generateInitialTemplate } from '@mocks/initialSeeds';

import VaultTemplate from '@src/models/VaultTemplate';

export default async function () {
  await VaultTemplate.create(await generateInitialTemplate()).save();
}
