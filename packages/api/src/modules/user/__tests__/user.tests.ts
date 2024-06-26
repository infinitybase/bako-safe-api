import axios from 'axios';
import { BakoSafe } from 'bakosafe';
import crypto from 'crypto';
import { Address } from 'fuels';

import { generateInitialUsers } from '@src/mocks/initialSeeds/initialUsers';
import { networks } from '@src/mocks/networks';
import { RecoverCodeType, TypeUser } from '@src/models';
import { AuthValidations } from '@src/utils/testUtils/Auth';

import { accounts } from '../../../mocks/accounts';

const { API_URL, UI_URL } = process.env;

describe('[USER]', () => {
  let api = beforeAll(() => {
    api = axios.create({
      baseURL: API_URL,
    });
  });

  test(
    'Create user',
    async () => {
      const code_length = `code${Address.fromRandom().toHexString()}`.length;
      await api
        .post('/user/', {
          name: `${new Date().getTime()} - Create user test`,
          type: TypeUser.FUEL,
          address: Address.fromRandom().toAddress(),
          provider: BakoSafe.getProviders('CHAIN_URL'),
        })
        .then(({ data, status }) => {
          expect(status).toBe(201);
          expect(data).toHaveProperty('id');
          expect(data).toHaveProperty('type', RecoverCodeType.AUTH);
          expect(data).toHaveProperty('origin', UI_URL);
          expect(data).toHaveProperty('code');
          expect(data.code.length).toBe(code_length);
        });
    },
    40 * 1000,
  );

  test(
    'Home endpoint',
    async () => {
      const auth = new AuthValidations(networks['local'], accounts['USER_1']);
      await auth.create();
      await auth.createSession();

      //list all predicates and transactions from user
      await auth.axios.get('user/me').then(({ data, status }) => {
        expect(status).toBe(200);
        expect(data).toHaveProperty('predicates');
        expect(data).toHaveProperty('transactions');
        expect(data.predicates.data.length).toBeLessThanOrEqual(8);
        expect(data.transactions.data.length).toBeLessThanOrEqual(8);
      });
    },
    10 * 1000,
  );

  test('Update user', async () => {
    const auth = new AuthValidations(networks['local'], accounts['USER_1']);
    await auth.create();
    await auth.createSession();
    const newName = `${new Date().getTime()} - Update user test`;
    //update user
    await auth.axios
      .put(`user/${auth.user.id}`, {
        name: newName,
      })
      .then(({ data, status }) => {
        expect(status).toBe(200);
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('name');
        expect(data).toHaveProperty('type', TypeUser.FUEL);
        expect(data.name).toBe(newName);
      });
  });

  test('Update user with existing name', async () => {
    const auth = new AuthValidations(networks['local'], accounts['USER_1']);
    await auth.create();
    await auth.createSession();

    const _auth = new AuthValidations(networks['local'], accounts['USER_5']);
    await _auth.create();
    await _auth.createSession();

    //get name from existing user
    const { data } = await auth.axios.get(`user/${auth.user.id}`);

    //update another user with existing name
    await _auth.axios
      .put(`user/${_auth.user.id}`, {
        name: data.name,
      })
      .catch(({ response }) => {
        expect(response.status).toBe(400);
        expect(response.data).toHaveProperty('title', 'Error on user update');
        expect(response.data).toHaveProperty(
          'detail',
          'User with name ' + data.name + ' already exists',
        );
      });
  });

  test('Inválid update user', async () => {
    const auth = new AuthValidations(networks['local'], accounts['USER_1']);
    await auth.create();
    await auth.createSession();

    const _auth = new AuthValidations(networks['local'], accounts['USER_5']);
    await _auth.create();
    await _auth.createSession();
    //update user
    await _auth.axios
      .put(`user/${auth.user.id}`, {
        name: '',
      })
      .catch(({ response }) => {
        expect(response.status).toBe(401);
        expect(response.data).toHaveProperty('title', 'Invalid permission');
      });
  });

  // if recives true, the name is already in use
  test(
    'validate existing name',
    async () => {
      const [user1] = await generateInitialUsers();
      //verify existing name
      await api.get(`/user/nickname/${user1.name}`).then(({ data, status }) => {
        expect(status).toBe(200);
        expect(data).toHaveProperty('address', user1.address);
        expect(data).toHaveProperty('name', user1.name);
        expect(data).toHaveProperty('provider', user1.provider);
        expect(data).toHaveProperty('type', user1.type);
      });

      //verify not existing name
      await api
        .get(`/user/nickaname/${crypto.randomUUID()}`)
        .then(({ data, status }) => {
          expect(status).toBe(200);
          expect(data).toStrictEqual({});
        });
    },
    3 * 1000,
  );
});
