import axios from 'axios';
import { Address } from 'fuels';

import { generateInitialUsers } from '@src/mocks/initialSeeds/initialUsers';
import { networks, providers } from '@src/mocks/networks';
import { AuthValidations } from '@src/utils/testUtils/Auth';

import { accounts } from '../../../mocks/accounts';

describe('[USER]', () => {
  let api = beforeAll(() => {
    api = axios.create({
      baseURL: 'http://localhost:3333',
    });
  });

  test(
    'Create user',
    async () => {
      await api
        .post('/user/', {
          address: Address.fromRandom().toAddress(),
          provider: providers['local'].name,
          name: `${new Date()} - Create user test`,
        })
        .then(({ data, status }) => {
          expect(status).toBe(201);
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

      //list by personal workspace
      await auth.axios.get('user/me').then(({ data, status }) => {
        expect(status).toBe(200);
        expect(data).toHaveProperty('predicates');
        expect(data).toHaveProperty('transactions');
        expect(data.predicates.data.length).toBeLessThanOrEqual(8);
        expect(data.transactions.data.length).toBeLessThanOrEqual(8);
        data.predicates.data.forEach(element => {
          expect(element.workspace).toHaveProperty('id', auth.workspace.id);
        });
        data.transactions.data.forEach(element => {
          expect(element.predicate.workspace).toHaveProperty(
            'id',
            auth.workspace.id,
          );
        });
      });
    },
    2 * 1000,
  );

  // if recives true, the name is already in use
  test(
    'validate existing name',
    async () => {
      const [user1] = await generateInitialUsers();
      await api.get(`/user/nickaname/${user1.name}`).then(({ data, status }) => {
        expect(status).toBe(200);
        expect(data).toBe(true);
      });
    },
    3 * 1000,
  );
});
