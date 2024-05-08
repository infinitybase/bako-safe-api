import axios from 'axios';
import { defaultConfig } from 'bakosafe';
import { Address } from 'fuels';
import path from 'path';
import dotenv from 'dotenv';

import { networks } from '@src/mocks/networks';
import { RecoverCodeType, TypeUser } from '@src/models';
import { AuthValidations } from '@src/utils/testUtils/Auth';

import { accounts } from '../../../mocks/accounts';

const envPath = path.resolve(process.cwd(), `.env.${process.env.NODE_ENV}`);

dotenv.config({ path: envPath });

describe('[USER]', () => {
  let api = beforeAll(() => {
    api = axios.create({
      baseURL: process.env.API_URL,
    });
  });

  test(
    'Create user',
    //'ATUAL',
    async () => {
      const code_length = 70;
      await api
        .post('/user/', {
          name: `${new Date().getTime()} - Create user test`,
          type: TypeUser.FUEL,
          address: Address.fromRandom().toAddress(),
          provider: defaultConfig['PROVIDER'],
        })
        .then(({ data, status }) => {
          expect(status).toBe(201);
          expect(data).toHaveProperty('id');
          expect(data).toHaveProperty('type', RecoverCodeType.AUTH);
          expect(data).toHaveProperty('origin', 'https://safe.bako.global');
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
    2 * 1000,
  );

  // if recives true, the name is already in use
  // test(
  //   'validate existing name',
  //   async () => {
  //     const [user1] = await generateInitialUsers();
  //     //verify existing name
  //     await api.get(`/user/nickname/${user1.name}`).then(({ data, status }) => {
  //       expect(status).toBe(200);
  //       expect(data).toHaveProperty('address', user1.address);
  //       expect(data).toHaveProperty('name', user1.name);
  //       expect(data).toHaveProperty('provider', user1.provider);
  //       expect(data).toHaveProperty('type', user1.type);
  //     });

  //     //verify not existing name
  //     await api
  //       .get(`/user/nickaname/${crypto.randomUUID()}`)
  //       .then(({ data, status }) => {
  //         expect(status).toBe(200);
  //         expect(data).toStrictEqual({});
  //       });
  //   },
  //   3 * 1000,
  // );
});
