import exp from 'constants';
import { add } from 'date-fns';

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
      const members = [data_user1.address, data_user2.address];
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
      .catch(e => {
        return e.response;
      });

    expect(status).toBe(401);
    expect(predicate_data.errors.detail).toEqual(
      'You do not have permission to access this resource',
    );
  });

  test('List predicates', async () => {
    const auth = new AuthValidations(networks['local'], accounts['USER_1']);
    await auth.create();
    await auth.createSession();

    type predicateMember = {
      id: string;
      address: string;
      avatar: string;
    };

    //on single workspace -> find by this user has signer
    // if member or signer or included on workspace of vault
    const validateListSingle = (members: predicateMember[]) => {
      return members.find(m => {
        return (
          m.id == auth.user.id &&
          m.address == auth.user.address &&
          m.avatar == auth.user.avatar
        );
      });
    };

    await auth.axios.get('/predicate').then(({ data, status }) => {
      expect(status).toBe(200);
      data.forEach(element => {
        const idValid =
          !!validateListSingle([...element.members, element.owner]) ||
          !!element.workspace.permissions[auth.user.id];
        expect(element).toHaveProperty('id');
        expect(idValid).toBe(true);
      });
    });

    //with pagination
    const page = 1;
    const perPage = 8;
    await auth.axios
      .get(`/predicate?page=${page}&perPage=${perPage}`)
      .then(({ data, status }) => {
        expect(status).toBe(200);
        expect(data).toHaveProperty('data');
        expect(data.data.length).toBeLessThanOrEqual(perPage);
        expect(data).toHaveProperty('total');
        expect(data).toHaveProperty('currentPage', page);
        expect(data).toHaveProperty('perPage', perPage);
      });

    //an another workspace
    const { data: data_workspace } = await generateWorkspacePayload(auth);
    await auth.selectWorkspace(data_workspace.id);
    await auth.axios.get('/predicate').then(({ data, status }) => {
      expect(status).toBe(200);
      expect(data).toHaveLength(0);
    });
  });

  test('Find predicate by id', async () => {
    const auth = new AuthValidations(networks['local'], accounts['USER_3']);
    await auth.create();
    await auth.createSession();

    //create a new workspace
    const {
      data: data_workspace,
      USER_5,
      data_user1,
      data_user2,
    } = await generateWorkspacePayload(auth);
    await auth.selectWorkspace(data_workspace.id);

    //create a new nicknames
    const { data: n_data5 } = await auth.axios.post('/address-book/', {
      address: USER_5.address,
      nickname: `[TESTE]${USER_5.address}`,
    });
    const { data: n_data1 } = await auth.axios.post('/address-book/', {
      address: data_user1.address,
      nickname: `[TESTE]${data_user1.address}`,
    });
    const { data: n_data2 } = await auth.axios.post('/address-book/', {
      address: data_user2.address,
      nickname: `[TESTE]${data_user2.address}`,
    });

    //create a vault
    const members = [USER_5.address, data_user1.address, data_user2.address];

    const { predicatePayload } = await PredicateMock.create(3, members);
    const { data: data_predicate } = await auth.axios.post(
      '/predicate',
      predicatePayload,
    );

    await auth.axios
      .get(`/predicate/${data_predicate.id}`)
      .then(({ data, status }) => {
        const { workspace, members, id } = data;
        const n_members = [n_data2.nickname, n_data1.nickname, n_data5.nickname];

        expect(status).toBe(200);

        //validate workspace members
        workspace.addressBook.forEach(element => {
          const aux = n_members.includes(element.nickname);
          expect(aux).toBe(true);
        });

        //validate members
        members.forEach(element => {
          const aux = members.find(m => element.id === m.id);
          expect(!!aux).toBe(true);
        });

        //validate vault
        expect(id).toBe(data_predicate.id);
      });
  });
});
