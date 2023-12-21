import axios from 'axios';

import { accounts } from '@src/mocks/accounts';

describe('[User]', () => {
  let api = beforeAll(() => {
    api = axios.create({
      baseURL: 'http://localhost:3333',
    });
  });

  test(
    'List workspaces to user',
    async () => {
      const { data, status } = await api.get(
        `/workspace/by-user/${accounts['USER_1'].address}`,
      );

      expect(status).toBe(200);
      expect(data).toBeInstanceOf(Array);

      expect(data[0]).toHaveProperty('id');
      expect(data[0]).toHaveProperty('owner');
      expect(data[0]).toHaveProperty('members');
    },
    40 * 1000,
  );
});
