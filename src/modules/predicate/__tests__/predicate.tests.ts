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
    const auth = new AuthValidations(networks['local'], accounts['USER_2']);
    await auth.create();
    await auth.createSession();
    const user_aux = [
      Address.fromRandom().toString(),
      Address.fromRandom().toString(),
    ];
    const workspace_name = `${new Date()} - Create workspace test [PREDICATE]`;

    //create a new workspace
    const { data: data_user1 } = await auth.axios.post('/user/', {
      address: accounts['USER_1'].address,
      provider: networks['local'],
      name: `${new Date()} - Create user test [PREDICATE]`,
    });
    const { data: data_user2 } = await auth.axios.post('/user/', {
      address: user_aux[1],
      provider: networks['local'],
      name: `${new Date()} - Create user test [PREDICATE]`,
    });
    const { data: data_workspace } = await auth.axios.post(`/workspace/`, {
      name: workspace_name,
      description: '[GENERATED] Workspace [PREDICATE] description',
      members: [data_user1.id, data_user2.id],
    });

    //auth with new account
    const auth_aux = new AuthValidations(networks['local'], accounts['USER_1']);
    await auth_aux.create();
    await auth_aux.createSession();
    const { data } = await auth.axios.get(
      `/workspace/by-user/${accounts['USER_1'].address}`,
    );
    const w = data.find(w => w.name == workspace_name);
    //console.log('[a]: ', auth_aux.workspace, w);
    await auth.selectWorkspace(w.id);

    //console.log('[b]: ', auth.workspace, w.id);

    const { predicatePayload } = await PredicateMock.create(1, [
      accounts['USER_1'].address,
      accounts['USER_2'].address,
      accounts['USER_3'].address,
    ]);

    //console.log('[c]: ', auth_aux.workspace, auth_aux.axios.defaults.headers);

    const { status, data: predicate_data } = await auth_aux.axios
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
