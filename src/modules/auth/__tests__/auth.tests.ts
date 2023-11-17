import supertest from 'supertest';

import { accounts } from '@src/mocks/accounts';
import { networks } from '@src/mocks/networks';
import App from '@src/server/app';
import Bootstrap from '@src/server/bootstrap';
import { AuthValidations } from '@src/utils/testUtils/Auth';

const app = new App();

describe('[AUTH]', () => {
  beforeAll(async () => {
    await Bootstrap.start();
    await app.init();
  });

  const request = supertest(app.serverApp);

  test(
    'Sign in',
    async () => {
      const auth = new AuthValidations(
        request,
        networks['local'],
        accounts['USER_1'],
      );

      await auth.create();

      await auth.createSession();

      expect(auth.user.address).toBe(accounts['USER_1'].address);
      expect(auth.authToken);
    },
    40 * 1000,
  );
});
