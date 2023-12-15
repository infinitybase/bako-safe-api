import { generateInitialPredicate } from '@mocks/initialSeeds/initialPredicate';

import { Predicate } from '@models/index';

export default async function () {
  const existingPredicates = (await Predicate.find()).length > 0;

  if (existingPredicates) {
    return;
  }
  await Predicate.create(await generateInitialPredicate()).save();
}
