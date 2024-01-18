import { Address } from 'fuels';

import { accounts } from '@src/mocks/accounts';
import { networks } from '@src/mocks/networks';
import { PredicateMock } from '@src/mocks/predicate';
import { PermissionRoles } from '@src/models/Workspace';
import { AuthValidations } from '@src/utils/testUtils/Auth';
import { generateWorkspacePayload } from '@src/utils/testUtils/Workspace';

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
      const {
        data: data_workspace,
        data_user1,
        data_user2,
        USER_5,
      } = await generateWorkspacePayload(api);
      const members = [USER_5.address, data_user1.address, data_user2.address];
      const { predicatePayload } = await PredicateMock.create(1, members);
      const { data } = await api.axios.post('/predicate', predicatePayload);

      const { data: workspace, status: status_find } = await api.axios.get(
        `/workspace/${api.workspace.id}`,
      );

      //predicate validation
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty(
        'predicateAddress',
        predicatePayload.predicateAddress,
      );
      expect(data).toHaveProperty('owner.address', accounts['USER_1'].address);

      //permissions validation
      expect(
        workspace.permissions[data_user1.id][PermissionRoles.SIGNER],
      ).toContain(data.id);
      expect(
        workspace.permissions[data_user2.id][PermissionRoles.SIGNER],
      ).toContain(data.id);
      expect(workspace.permissions[USER_5.id][PermissionRoles.SIGNER]).toContain(
        data.id,
      );
    },
    10 * 1000,
  );

  test('Create predicate with invalid owner permission', async () => {
    const auth = new AuthValidations(networks['local'], accounts['USER_1']);
    await auth.create();
    await auth.createSession();

    //create a new workspace
    const { data: data_workspace } = await generateWorkspacePayload(auth);

    //auth with new account
    const auth_aux = new AuthValidations(networks['local'], accounts['USER_5']);
    await auth_aux.create();
    await auth_aux.createSession();
    await auth_aux.selectWorkspace(data_workspace.id);

    const { predicatePayload } = await PredicateMock.create(1, [
      accounts['USER_1'].address,
      accounts['USER_2'].address,
      accounts['USER_3'].address,
    ]);

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
