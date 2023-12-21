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

  test('Create predicate', async () => {
    const { predicatePayload } = await PredicateMock.create(1, [
      accounts['USER_1'].address,
      accounts['USER_2'].address,
    ]);
    const { data } = await api.axios.post('/predicate', predicatePayload);

    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty(
      'predicateAddress',
      predicatePayload.predicateAddress,
    );
    expect(data).toHaveProperty('owner.address', accounts['USER_1'].address);
    expect(data).toHaveProperty('members[0].address', accounts['USER_1'].address);
    expect(data).toHaveProperty('members[1].address', accounts['USER_2'].address);
  });

  test('Find predicate by ID', async () => {
    const { predicatePayload } = await PredicateMock.create(1, [
      accounts['USER_1'].address,
      accounts['USER_2'].address,
    ]);
    const { data } = await api.axios.post('/predicate', predicatePayload);

    const { data: predicate } = await api.axios.get(`/predicate/${data.id}`);

    // expect(predicate).toHaveProperty('id', data.id);
    // expect(predicate).toHaveProperty('predicateAddress', data.predicateAddress);
  });

  test('Find predicate by Address', async () => {
    const { predicatePayload } = await PredicateMock.create(1, [
      accounts['USER_1'].address,
      accounts['USER_2'].address,
    ]);
    const { data } = await api.axios.post('/predicate', predicatePayload);

    const { data: predicate } = await api.axios.get(
      `/predicate/by-address/${data.predicateAddress}`,
    );

    // expect(predicate).toHaveProperty('id', data.id);
    // expect(predicate).toHaveProperty('predicateAddress', data.predicateAddress);
  });

  test(`List predicates of user ${accounts['USER_1'].address}`, async () => {
    const params = {
      page: 1,
      perPage: 10,
      orderBy: 'createdAt',
      sort: 'DESC',
      //todo: fix bug to request with owner
      //owner: accounts['USER_1'].address,
    };
    const { data } = await api.axios.get('/predicate/', { params });
    // expect(data).toHaveProperty('currentPage', 1);
    // expect(data).toHaveProperty('perPage', 10);
    // expect(data).toHaveProperty('data[0]', expect.any(Object));
    //todo: fix bug to request with owner
    //expect(data).toHaveProperty('data[0].owner.id', );
  });
});
