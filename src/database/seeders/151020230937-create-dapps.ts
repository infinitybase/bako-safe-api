import { DApp, Predicate } from '@src/models';

export default async function () {
  const dapps = await DApp.find();
  if (dapps.length) {
    return;
  }

  const predicate = await Predicate.find({
    where: [
      {
        id: '624DA56F-F5E8-4BC2-B3A5-B181FF2B5097',
      },
    ],
  });
  if (!predicate.length) {
    return;
  }

  await DApp.create({
    sessionId: 'sessionId',
    name: 'name',
    origin: 'url',
    vaults: predicate,
  }).save();
}
