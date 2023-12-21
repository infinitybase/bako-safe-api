import exp from 'constants';

import { accounts } from '@src/mocks/accounts';
import { networks } from '@src/mocks/networks';
import { AuthValidations } from '@src/utils/testUtils/Auth';

describe('[AUTH]', () => {
  test(
    'Sign in with personal workspace',
    async () => {
      const auth = new AuthValidations(networks['local'], accounts['USER_1']);

      await auth.create();

      await auth.createSession();

      expect(auth.user.address).toBe(accounts['USER_1'].address);
      expect(auth.authToken);
    },
    40 * 1000,
  );

  test(
    'Sign in with personal workspace and select other workspace',
    async () => {
      //crate a session
      const auth = new AuthValidations(networks['local'], accounts['USER_1']);
      await auth.create();
      await auth.createSession();

      //select a other workspace
      const { data } = await auth.axios.get(
        `/workspace/by-user/${accounts['USER_1'].address}`,
      );
      const w_upgrade = data[0].id;

      //select workspace
      const workspace_updated = await auth.selectWorkspace(w_upgrade);

      expect(workspace_updated.workspace.id).toEqual(w_upgrade);
      expect(workspace_updated.address).toEqual(accounts['USER_1'].address);
      expect(workspace_updated).toHaveProperty('token');
    },
    40 * 1000,
  );
});
