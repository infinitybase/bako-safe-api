/* import { accounts } from '@src/mocks/accounts';
import { networks } from '@src/mocks/networks';
import { AuthValidations } from '@src/utils/testUtils/Auth';

describe('[TRANSACTION]', () => {
  let api: AuthValidations;
  beforeAll(async () => {
    api = new AuthValidations(networks['local'], accounts['USER_1']);

    await api.create();
    await api.createSession();
  });

  test('list transaction by hash', async () => {
    const hash = '';
    const { data } = await api.axios.get(`/transaction/by-hash/${hash}`);
    //expect(data).toHaveProperty('id');
  });
});
*/
