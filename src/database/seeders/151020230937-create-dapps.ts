import { DApp, Predicate } from '@src/models';

import { User } from '@models/index';

export default async function () {
  const dapps = await DApp.find();
  if (dapps.length) {
    return;
  }

  const vault = await Predicate.find();
  if (!vault.length) {
    return;
  }

  const a = await DApp.create({
    sessionId: 'sessionId',
    name: 'name',
    origin: 'url',
    vaults: [vault[0]],
    currentVault: vault[0],
  }).save();

  a.vaults = [...a.vaults, vault[1]];
  await a.save();
}
