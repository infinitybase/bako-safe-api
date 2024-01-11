import exp from 'constants';
import { Address } from 'fuels';

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
      const user_aux = Address.fromRandom().toString();
      const { predicatePayload } = await PredicateMock.create(1, [
        accounts['USER_1'].address,
        user_aux,
      ]);
      const { data } = await api.axios.post('/predicate', predicatePayload);

      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty(
        'predicateAddress',
        predicatePayload.predicateAddress,
      );
      expect(data).toHaveProperty('owner.address', accounts['USER_1'].address);
      expect(data).toHaveProperty('members[0].address', accounts['USER_1'].address);
      expect(data).toHaveProperty('members[1].address', user_aux);
    },
    10 * 1000,
  );

  test('Create predicate with invalid owner permission', async () => {
    const { data } = await api.axios.get(
      `/workspace/by-user/${accounts['USER_1'].address}`,
    );
    const w = data.find(w => w.name.includes('[INITIAL]'));

    await api.selectWorkspace(w.id);
    const { predicatePayload } = await PredicateMock.create(1, [
      accounts['USER_1'].address,
      accounts['USER_2'].address,
    ]);
    const { status, data: predicate_data } = await api.axios
      .post('/predicate', predicatePayload)
      .catch(e => e.response);

    expect(status).toBe(401);
    expect(predicate_data.errors.detail).toEqual(
      'You do not have permission to access this resource',
    );
  });

  // test('Find predicate by ID', async () => {
  //   const { predicatePayload } = await PredicateMock.create(1, [
  //     accounts['USER_1'].address,
  //     accounts['USER_2'].address,
  //   ]);
  //   const { data } = await api.axios.post('/predicate', predicatePayload);

  //   const { data: predicate } = await api.axios.get(`/predicate/${data.id}`);

  //   // expect(predicate).toHaveProperty('id', data.id);
  //   // expect(predicate).toHaveProperty('predicateAddress', data.predicateAddress);
  // });

  // test('Find predicate by Address', async () => {
  //   const { predicatePayload } = await PredicateMock.create(1, [
  //     accounts['USER_1'].address,
  //     accounts['USER_2'].address,
  //   ]);
  //   const { data } = await api.axios.post('/predicate', predicatePayload);

  //   const { data: predicate } = await api.axios.get(
  //     `/predicate/by-address/${data.predicateAddress}`,
  //   );

  //   // expect(predicate).toHaveProperty('id', data.id);
  //   // expect(predicate).toHaveProperty('predicateAddress', data.predicateAddress);
  // });
});
