import { generateInitialPredicateVersion } from '@src/mocks/initialSeeds/initialPredicateVersion';
import { PredicateVersion } from '@src/models';

export default async function () {
  await PredicateVersion.create(await generateInitialPredicateVersion()).save();
}
