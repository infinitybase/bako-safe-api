import { ICreatePayload } from '@modules/vaultTemplate/types';

import { accounts } from './accounts';

export const vaultTemplate: Omit<ICreatePayload, 'createdBy'> = {
  name: '[TEST] Name of vault',
  description: '[TEST] Description of vault',
  minSigners: 2,
  signers: JSON.stringify([
    accounts['USER_1'].address,
    accounts['USER_2'].address,
    accounts['USER_3'].address,
    accounts['USER_4'].address,
  ]),
};
