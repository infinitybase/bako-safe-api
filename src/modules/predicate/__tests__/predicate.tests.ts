import { accounts } from '@src/mocks/accounts';
import { networks } from '@src/mocks/networks';
import { PredicateMock } from '@src/mocks/predicate';
import { AuthValidations } from '@src/utils/testUtils/Auth';

describe('[PREDICATE]', () => {
  let api: AuthValidations;
  beforeAll(async () => {
    api = new AuthValidations(networks['local'], accounts['USER_1']);

    await api.create();
    await api.createSession();
  });

  test(
    'Create predicate',
    async () => {
      const vault = await PredicateMock.create(1, [
        accounts['USER_1'].address,
        accounts['USER_2'].address,
      ]);
      const { data } = await api.axios.post('/predicate', vault.predicatePayload);
      expect(data).toHaveProperty('id');
    },
    40 * 1000,
  );
});
