import { ICreatePayload } from '@modules/vaultTemplate/types';

export const vaultTemplate: Omit<ICreatePayload, 'createdBy'> = {
  name: '[TEST] Name of vault',
  description: '[TEST] Description of vault',
  minSigners: 2,
};
