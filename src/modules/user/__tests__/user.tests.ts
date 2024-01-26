import axios from 'axios';
import { Address } from 'fuels';

import { providers } from '@src/mocks/networks';

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
          expect(data).toHaveProperty('id');
          expect(data).toHaveProperty('address');
        });
    },
    40 * 1000,
  );
});
