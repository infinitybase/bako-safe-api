import { Address } from 'fuels';

import { accounts } from '@src/mocks/accounts';
import { providers } from '@src/mocks/networks';
import { networks } from '@src/mocks/networks';
import { PermissionRoles, defaultPermissions } from '@src/models/Workspace';
import { AuthValidations } from '@src/utils/testUtils/Auth';

describe('[ADDRESS_BOOK]', () => {
  let api: AuthValidations;
  let single_workspace: string;
  beforeAll(async () => {
    api = new AuthValidations(networks['local'], accounts['USER_1']);

    await api.create();
    await api.createSession();
    single_workspace = api.workspace.id;
  });

  test(
    'Create address book using a personal workspace',
    async () => {
      const nickname = `[FAKE_CONTACT_NAME]: ${Address.fromRandom().toAddress()}`;
      const address = Address.fromRandom().toAddress();
      const { data } = await api.axios.post('/address-book/', {
        nickname,
        address,
      });

      const aux = await api.axios
        .post('/address-book/', {
          nickname,
          address,
        })
        .catch(e => e.response.data);

      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('nickname', nickname);
      expect(data).toHaveProperty('user.address', address);

      expect(aux).toHaveProperty('detail', 'Duplicated nickname');
    },
    5 * 1000,
  );

  test(
    'Create address book using a group workspace',
    async () => {
      const { data: data_user1 } = await api.axios.post('/user/', {
        address: Address.fromRandom().toAddress(),
        provider: providers['local'].name,
        name: `${new Date()} - Create user test`,
      });
      const { data: data_user2 } = await api.axios.post('/user/', {
        address: Address.fromRandom().toAddress(),
        provider: providers['local'].name,
        name: `${new Date()} - Create user test`,
      });

      const { data: _data, status } = await api.axios.post(`/workspace/`, {
        name: '[ADDBOOK_TEST] Workspace 1',
        description: '[ADDBOOK_TEST] Workspace 1 description',
        members: [data_user1.id, data_user2.id],
      });

      await api.selectWorkspace(_data.id);
      const nickname = `[FAKE_CONTACT_NAME]: ${Address.fromRandom().toAddress()}`;
      const address = Address.fromRandom().toAddress();
      const { data } = await api.axios.post('/address-book/', {
        nickname,
        address,
      });

      const aux = await api.axios
        .post('/address-book/', {
          nickname,
          address,
        })
        .catch(e => e.response.data);

      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('nickname', nickname);
      expect(data).toHaveProperty('user.address', address);

      expect(aux).toHaveProperty('detail', 'Duplicated nickname');
    },
    5 * 1000,
  );

  test(`List address book of user ${accounts['USER_1'].address}`, async () => {
    //list with not single workspace, including your address book and other users address book of workspace
    const { data, status } = await api.axios.get(`/address-book`);
    const { workspace } = api;

    const notSingle = data.filter(i => i.owner.id === workspace.id);

    //list with single workspace, including just your address book
    await api.selectWorkspace(single_workspace);
    const single = data.filter(i => i.owner.id === single_workspace);

    expect(status).toBe(200);
    expect(data).toBeInstanceOf(Array);

    expect(data[0]).toHaveProperty('id');
    expect(data[0]).toHaveProperty('nickname');
    expect(data[0]).toHaveProperty('user');
    expect(data[0]).toHaveProperty('owner.id');

    expect(notSingle.length).toBeGreaterThan(0);
    expect(single.length).toBeGreaterThan(0);
  });
});
