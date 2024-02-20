import {
  generateInitialWorkspace,
  generateInitialAuxWorkspace,
} from '@src/mocks/initialSeeds/initialWorkspace';

export default async function () {
  await (await generateInitialWorkspace()).save();
  await (await generateInitialAuxWorkspace()).save();
}
