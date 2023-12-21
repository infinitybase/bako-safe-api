import { accounts } from '@src/mocks/accounts';
import { networks } from '@src/mocks/networks';
import { AuthValidations } from '@src/utils/testUtils/Auth';

describe('[ADDRESS_BOOK]', () => {
  let api: AuthValidations;
  beforeAll(async () => {
    api = new AuthValidations(networks['local'], accounts['USER_1']);

    await api.create();
    await api.createSession();
  });

  test(`List address book of user ${accounts['USER_2'].address}`, async () => {
    //todo: fix this request using pagination
    // const params = {
    //   page: 1,
    //   perPage: 10,
    //   //orderBy: 'createdAt',
    //   //sort: 'DESC',
    // };
    const { data } = await api.axios.get('/address-book/');

    // expect(data).toHaveProperty('[0]', expect.any(Object));
    //expect(data.addressBook).toHaveLength(1);
  });

  test(
    'Create address book',
    async () => {
      const { data } = await api.axios.post('/address-book/', {
        nickname: 'fake_name',
        address: accounts['USER_1'].address,
      });

      // expect(data).toHaveProperty('id');
      // expect(data).toHaveProperty('name', 'fake_name');
      // expect(data).toHaveProperty('address', accounts['USER_2'].address);
    },
    5 * 1000,
  );
});
