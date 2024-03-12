import crypto from 'crypto';

import { DApp, Predicate } from '@src/models';

export const generateInitialDapp = async (): Promise<Partial<DApp>> => {
  const predicate = await Predicate.findOne({
    order: {
      createdAt: 'ASC',
    },
  });

  const t1: Partial<DApp> = {
    sessionId: crypto.randomUUID(),
    origin: 'https://safe.bako.global',
    name: 'BSAFE - multsig',
    vaults: [predicate],
    currentVault: predicate,
  };

  return t1;
};
