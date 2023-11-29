/*import { Request } from 'supertest';

import { accounts } from '@src/mocks/accounts';
import { networks } from '@src/mocks/networks';
import { AuthValidations } from '@src/utils/testUtils/Auth';

describe('[AUTH]', () => {
  test(
    'Sign in',
    async () => {
      const auth = new AuthValidations(networks['local'], accounts['USER_1']);

      await auth.create();

      await auth.createSession();

      expect(auth.user.address).toBe(accounts['USER_1'].address);
      expect(auth.authToken);
    },
    40 * 1000,
  );
});
*/
