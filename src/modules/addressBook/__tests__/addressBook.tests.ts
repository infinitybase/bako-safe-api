import { Address } from 'fuels';

import { accounts } from '@src/mocks/accounts';
import { providers } from '@src/mocks/networks';
import { networks } from '@src/mocks/networks';
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
        name: `${new Date().getTime()} - Create user test`,
      });
      const { data: data_user2 } = await api.axios.post('/user/', {
        address: Address.fromRandom().toAddress(),
        provider: providers['local'].name,
        name: `${new Date().getTime()} - Create user test`,
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

  test(
    `list addressBook`,
    async () => {
      //list with single workspace [your address book]
      await api.axios.get(`/address-book`).then(({ data, status }) => {
        expect(status).toBe(200);
        data.forEach(element => {
          expect(element).toHaveProperty('nickname');
          expect(element.user).toHaveProperty('address');

          expect(element.owner).toHaveProperty('id', api.workspace.id);
        });
      });

      //list with workspace
      const auth = new AuthValidations(networks['local'], accounts['USER_1']);
      await auth.create();
      await auth.createSession();

      const old_workspace = api.workspace.id;

      await auth.axios.get(`/workspace/by-user`).then(async ({ data, status }) => {
        const new_workspace = data.find(i => i.id !== old_workspace);
        const owners = [new_workspace.id, api.workspace.id];

        //with pagination
        const page = 1;
        const perPage = 8;
        await auth.axios
          .get(`/address-book?page=${page}&perPage=${perPage}`)
          .then(({ data, status }) => {
            expect(status).toBe(200);
            expect(data.data.length).toBeLessThanOrEqual(perPage);
            expect(data).toHaveProperty('total');
            expect(data).toHaveProperty('currentPage', page);
            expect(data).toHaveProperty('perPage', perPage);
          });

        //with personal contacts
        await auth.axios.get(`/address-book`).then(({ data, status }) => {
          data.forEach(element => {
            expect(status).toBe(200);
            expect(element).toHaveProperty('id');
            expect(element).toHaveProperty('nickname');
            expect(element.user).toHaveProperty('address');
            expect(element.owner).toHaveProperty('id', auth.workspace.id);
          });
        });

        //without personal contacts
        await auth.selectWorkspace(new_workspace.id);
        await auth.axios.get(`/address-book`).then(({ data, status }) => {
          data.forEach(element => {
            expect(status).toBe(200);
            expect(element).toHaveProperty('id');
            expect(element).toHaveProperty('nickname');
            expect(element.user).toHaveProperty('address');
            expect(element.owner).toHaveProperty('id', new_workspace.id);
          });
        });

        await auth.axios
          .get(`/address-book?includePersonal=true`)
          .then(({ data, status }) => {
            data.forEach(element => {
              expect(status).toBe(200);
              expect(element).toHaveProperty('id');
              expect(element).toHaveProperty('nickname');
              expect(element.user).toHaveProperty('address');
              const aux = owners.includes(element.owner.id);
              expect(aux).toBe(true);
            });
          });
      });
    },
    10 * 1000,
  );
});
