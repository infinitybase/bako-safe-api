import { generateInitialWorkspace } from '@src/mocks/initialSeeds/initialWorkspace';

export default async function () {
  await (await generateInitialWorkspace()).save();
}
