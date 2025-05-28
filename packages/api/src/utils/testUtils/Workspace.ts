import { Address } from 'fuels';

import { TypeUser } from '@src/models';

import { IAccountKeys, accounts } from '../../mocks/accounts';
import { AuthValidations } from './Auth';
import { networks } from '@src/mocks/networks';
// import { BakoSafe } from 'bakosafe';
import App from '@src/server/app';
import Express from 'express';
import request from 'supertest';

const generateUser = async (
  api: AuthValidations,
  app: Express.Application,
  address?: IAccountKeys,
) => {
  const addRandom = Address.fromRandom().toAddress();
  // const { data } = await api.axios.post('/user/', {
  //   address: address ? accounts[address].address : addRandom,
  //   provider: networks['devnet'],
  //   name: `${new Date().getTime()} - Create user test`,
  //   type: TypeUser.FUEL,
  // });

  const { body: data } = await request(app)
    .post('/user/')
    .send({
      address: address ? accounts[address].address : addRandom,
      provider: networks['devnet'],
      name: `${new Date().getTime()} - Create user test`,
      type: TypeUser.FUEL,
    });

  return {
    id: data.userId,
    address: addRandom,
    name: data.name,
    type: TypeUser.FUEL,
  };
};

const generateWorkspacePayload = async (
  api: AuthValidations,
  app: Express.Application,
) => {
  const data_user1 = await generateUser(api, app);
  const data_user2 = await generateUser(api, app);
  const USER_5 = await generateUser(api, app, 'USER_5');
  const USER_3 = await generateUser(api, app, 'USER_3');

  const { data, status } = await api.axios.post(`/workspace/`, {
    name: `[GENERATED] Workspace 1 ${new Date()}`,
    description: '[GENERATED] Workspace 1 description',
    members: [
      data_user1.id,
      data_user2.id,
      USER_5.id,
      USER_3.id,
      Address.fromRandom().toAddress(),
    ],
  });

  return { data, status, data_user1, data_user2, USER_5 };
};

export { generateWorkspacePayload, generateUser };
