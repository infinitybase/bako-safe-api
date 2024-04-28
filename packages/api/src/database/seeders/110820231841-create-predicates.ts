import { generateInitialPredicate } from '@mocks/initialSeeds/initialPredicate';

import { Predicate } from '@models/index';

export default async function () {
  await Predicate.create(await generateInitialPredicate()).save();
}
