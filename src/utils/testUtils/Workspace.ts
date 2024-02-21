import { Address } from 'fuels';

import { providers } from '@src/mocks/networks';

import { accounts } from '../../mocks/accounts';
import { AuthValidations } from './Auth';

const generateWorkspacePayload = async (api: AuthValidations) => {
  const { data: data_user1 } = await api.axios.post('/user/', {
    address: Address.fromRandom().toAddress(),
    provider: providers['local'].name,
    name: `${new Date()}_1 - Create user test`,
  });
  const { data: data_user2 } = await api.axios.post('/user/', {
    address: Address.fromRandom().toAddress(),
    provider: providers['local'].name,
    name: `${new Date()}_2 - Create user test`,
  });

  const { data: USER_5 } = await api.axios.post('/user/', {
    address: accounts['USER_5'].address,
    provider: providers['local'].name,
    name: `${new Date()}_3 - Create user test`,
  });

  const { data, status } = await api.axios.post(`/workspace/`, {
    name: `[GENERATED] Workspace 1 ${new Date()}`,
    description: '[GENERATED] Workspace 1 description',
    members: [
      data_user1.id,
      data_user2.id,
      USER_5.id,
      Address.fromRandom().toAddress(),
    ],
  });

  return { data, status, data_user1, data_user2, USER_5 };
};

export { generateWorkspacePayload };
