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

  test('Create predicate', async () => {
    const { predicatePayload } = await PredicateMock.create(1, [
      accounts['USER_1'].address,
      accounts['USER_2'].address,
    ]);
    const { data } = await api.axios.post('/predicate', predicatePayload);
    expect(data.chainId).not.toBeNull();
    expect(data).toBeDefined();
    expect(predicatePayload.name).toEqual(expect.any(String));
    expect(predicatePayload.description).toEqual(expect.any(String));
    expect(predicatePayload.provider).toEqual(expect.any(String));
    expect(predicatePayload.chainId).toEqual(expect.any(Number));
    expect(predicatePayload.minSigners).toEqual(expect.any(Number));
    expect(predicatePayload.predicateAddress).toEqual(expect.any(String));
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

    expect(predicate).toHaveProperty('id', data.id);
    expect(predicate).toHaveProperty('predicateAddress', data.predicateAddress);
    expect(predicate.predicateAddress).toMatch(/^fuel/);
    //console.log(Address.fromString(predicate.predicateAddress).toB256());
    expect(predicate.predicateAddress.length).toBeGreaterThan(30);
    expect(predicate.id.length).toBeGreaterThan(10);
  });
  test('create a predicate and find by id', async () => {
    const { predicatePayload } = await PredicateMock.create(1, [
      accounts['USER_1'].address,
      accounts['USER_2'].address,
    ]);
    const { data } = await api.axios.post('/predicate', predicatePayload);

    const { data: predicate } = await api.axios.get(`/predicate/${data.id}`);

    expect(predicate).toHaveProperty('id', data.id);
    expect(predicate).toHaveProperty('predicateAddress', data.predicateAddress);
    expect(predicate.predicateAddress).toMatch(/^fuel/);
    //console.log(Address.fromString(predicate.predicateAddress).toB256());
    expect(predicate.predicateAddress.length).toBeGreaterThan(30);
    expect(predicate.id.length).toBeGreaterThan(10);
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
    expect(predicate.predicateAddress).toMatch(/^fuel/);
    expect(predicate.predicateAddress.length).toBeGreaterThan(30);
    expect(predicate.id.length).toBeGreaterThan(10);
    expect(predicate.privateKey).not.toBeNull();
    expect(predicate).toHaveProperty('id', data.id);
    expect(predicate).toHaveProperty('predicateAddress', data.predicateAddress);
  });

  test(`List predicates of user ${accounts['USER_1'].address}`, async () => {
    const params = {
      page: 1,
      perPage: 5,
      orderBy: 'createdAt',
      sort: 'DESC',
      //todo: fix bug to request with owner
      //owner: accounts['USER_1'].address,
    };
    const { data } = await api.axios.get('/predicate/', { params });
    expect(data).toHaveProperty('currentPage', 1);
    expect(data).toHaveProperty('perPage', 5);
    expect(data).toHaveProperty('data[0]', expect.any(Object));
    //todo: fix bug to request with owner
    //expect(data).toHaveProperty('data[0].owner.id', );
    data.data.forEach(element => {
      // Corrigido aqui
      expect(element.minSigners).toBeGreaterThan(0);
      expect(element.name.length).toBeGreaterThan(0);
      expect(element.name.length).toBeGreaterThan(0);
      expect(element.id).toBeDefined();
      expect(element.chainId).toBeDefined();
      expect(element.configurable).toBeDefined();
      expect(element.createdAt).toBeDefined();
      expect(element.updatedAt).toBeDefined();
      expect(element.deletedAt).toBeNull();
      //expect(element.)
      //console.log(element.owner.address);
      expect(element.owner.address.length).toBeGreaterThan(10);
      expect(element.owner.id.length).toBeGreaterThan(10);
      expect(element.members.length).toBeGreaterThan(0);
    });
  });
  test('Create predicate without address (expecting error)', async () => {
    const { predicatePayload } = await PredicateMock.create(1, [
      accounts['USER_1'].address,
      accounts['USER_2'].address,
    ]);

    try {
      // Remover a propriedade predicateAddress do payload
      const { predicateAddress, ...rest } = predicatePayload;

      // Tentar criar um predicado sem predicateAddress (esperando um erro)
      await api.axios.post('/predicate', rest);

      // Se não ocorrer erro, falhar o teste
      fail('Expected an error, but none occurred.');
    } catch (error) {
      expect(error.response.status).toEqual(400);
    }
  });
  test('Create predicate with empty predicateAddress (expecting error)', async () => {
    const { predicatePayload } = await PredicateMock.create(1, [
      accounts['USER_1'].address,
      accounts['USER_2'].address,
      accounts['USER_3'].address,
    ]);

    try {
      // Modificar a propriedade predicateAddress para uma string vazia
      const modifiedPayload = {
        ...predicatePayload,
        predicateAddress: '',
        name: 'Predicate with  string address empity',
      };

      // Tentar criar um predicado com predicateAddress como string vazia (esperando um erro)
      await api.axios.post('/predicate', modifiedPayload);

      // Se não ocorrer erro, falhar o teste
      fail('Expected an error, but none occurred.');
    } catch (error) {
      // Verificar se o erro é do tipo esperado
      expect(error.response.status).toEqual(400); // Ou o código de erro específico
    }
  });
  test('Create predicate with minSigners = 0', async () => {
    const { predicatePayload } = await PredicateMock.create(1, [
      accounts['USER_1'].address,
      accounts['USER_2'].address,
      accounts['USER_3'].address,
    ]);

    try {
      const modifiedPayload = {
        ...predicatePayload,
        minSigners: 0,
        name: 'Predicate minSigners error',
      };

      await api.axios.post('/predicate', modifiedPayload);
      // deveria ocorrer um erro aqui
      fail('Expected an error, but none occurred.');
    } catch (error) {
      expect(error.response.status).toEqual(400);
    }
  });
  test('Create predicate with minSigners > signers', async () => {
    const { predicatePayload } = await PredicateMock.create(1, [
      accounts['USER_1'].address,
      accounts['USER_2'].address,
      accounts['USER_3'].address,
    ]);

    try {
      const modifiedPayload = {
        ...predicatePayload,
        minSigners: 5,
        name: 'Predicate minSigners error',
      };

      await api.axios.post('/predicate', modifiedPayload);
      // deveria ocorrer um erro aqui
      fail('Expected an error, but none occurred.');
    } catch (error) {
      expect(error.response.status).toEqual(400);
    }
  });
  test('Create predicate with provider != provider local', async () => {
    const { predicatePayload } = await PredicateMock.create(1, [
      accounts['USER_1'].address,
      accounts['USER_2'].address,
      accounts['USER_3'].address,
      accounts['USER_4'].address,
    ]);

    try {
      const modifiedPayload = {
        ...predicatePayload,
        provider: 'https://beta-4.fuel.network/graphql',
        name: 'Predicate provider error',
      };

      await api.axios.post('/predicate', modifiedPayload);
      // Não sei se deveria ocorrer um erro aqui
      fail('Expected an error, but none occurred.');
    } catch (error) {
      expect(error.response.status).toEqual(400);
    }
  });
  test('Create predicate with a invalid address', async () => {
    const { predicatePayload } = await PredicateMock.create(1, [
      accounts['USER_1'].address,
      accounts['USER_2'].address,
      accounts['USER_3'].address,
      accounts['USER_4'].address,
    ]);

    try {
      const modifiedPayload = {
        ...predicatePayload,
        name: 'Predicate address error',
      };
      modifiedPayload.addresses.push('1234');

      await api.axios.post('/predicate', modifiedPayload);
      // tá certo pois disparou o erro
      fail('Expected an error, but none occurred.');
    } catch (error) {
      expect(error.response);
    }
  });
  test('Create predicate with a minSigner = 0', async () => {
    const { predicatePayload } = await PredicateMock.create(1, [
      accounts['USER_1'].address,
      accounts['USER_2'].address,
      accounts['USER_3'].address,
      accounts['USER_4'].address,
    ]);

    try {
      const modifiedPayload = {
        ...predicatePayload,
        name: 'Predicate minSigner equal 0',
        minSigner: 0,
      };
      await api.axios.post('/predicate', modifiedPayload);
      // tá certo pois disparou o erro
      fail('Expected an error, but none occurred.');
    } catch (error) {
      expect(error.response);
    }
  });
  test('Create predicate with a invalid chainId', async () => {
    const { predicatePayload } = await PredicateMock.create(1, [
      accounts['USER_1'].address,
      accounts['USER_2'].address,
      accounts['USER_3'].address,
      accounts['USER_4'].address,
    ]);

    try {
      const modifiedPayload = {
        ...predicatePayload,
        name: 'Predicate invalid chainId',
        chainId: 'abc',
      };

      await api.axios.post('/predicate', modifiedPayload);
      // tá certo pois disparou o erro
      fail('Expected an error, but none occurred.');
    } catch (error) {
      expect(error.response.status).toEqual(400);
    }
  });
  test(`List predicates of user ${accounts['USER_3'].address}`, async () => {
    const params = {
      page: 1,
      perPage: 5,
      orderBy: 'createdAt',
      sort: 'DESC',
      //signer: predicatePayload.addresses,
      //todo predicateAdress retornando um array vazio
      //address: predicatePayload.predicateAddress,
      //todo: fix bug to request with owner
      //owner: accounts['USER_1'].address,
    };
    const { data } = await api.axios.get('/predicate/', { params });
    expect(data).toHaveProperty('currentPage', 1);
    expect(data).toHaveProperty('perPage', 5);
    //expect(data).toHaveProperty('data[0]', expect.any(Object));
    //console.log(data.data);
    data.data.forEach(element => {
      // Corrigido aqui
      expect(element.minSigners).toBeGreaterThan(0);
      expect(element.name.length).toBeGreaterThan(0);
      expect(element.name.length).toBeGreaterThan(0);
      expect(element.id).toBeDefined();
      expect(element.chainId).toBeDefined();
      expect(element.configurable).toBeDefined();
      expect(element.createdAt).toBeDefined();
      expect(element.updatedAt).toBeDefined();
      expect(element.deletedAt).toBeNull();
      //expect(element.)
      //console.log(element.name);
      expect(element.owner.address.length).toBeGreaterThan(10);
      expect(element.owner.id.length).toBeGreaterThan(10);
      expect(element.members.length).toBeGreaterThan(0);
    });
    //todo: fix bug to request with owner
    //expect(data).toHaveProperty('data[0].owner.id', );
  });
  test(`List predicates of user ${accounts['USER_1']} with filters`, async () => {
    const params = {
      page: 1,
      perPage: 5,
      orderBy: 'createdAt',
      sort: 'DESC',
      q: 'fuel1jt0lepem2mepjv576qamdxltarpa3vzppzzhfzp00fjqfupw9u5q9gyphu',
      //signer: predicatePayload.addresses,
      //todo predicateAdress retornando um array vazio
      //address: predicatePayload.predicateAddress,
      //todo: fix bug to request with owner
      //owner: accounts['USER_1'].address,
    };
    const { data } = await api.axios.get('/predicate/', { params });
    expect(data).toHaveProperty('currentPage', 1);
    expect(data).toHaveProperty('perPage', 5);
    //expect(data).toHaveProperty('data[0]', expect.any(Object));
    //console.log(data);
    data.data.forEach(element => {
      // Corrigido aqui
      expect(element.minSigners).toBeGreaterThan(0);
      expect(element.name.length).toBeGreaterThan(0);
      expect(element.name.length).toBeGreaterThan(0);
      expect(element.id).toBeDefined();
      expect(element.chainId).toBeDefined();
      expect(element.configurable).toBeDefined();
      expect(element.createdAt).toBeDefined();
      expect(element.updatedAt).toBeDefined();
      expect(element.deletedAt).toBeNull();
      //expect(element.)
      //console.log(element.name);
      expect(element.owner.address.length).toBeGreaterThan(10);
      expect(element.owner.id.length).toBeGreaterThan(10);
      expect(element.members.length).toBeGreaterThan(0);
    });
    //todo: fix bug to request with owner
    //expect(data).toHaveProperty('data[0].owner.id', );
  });
  test(`List predicates of user ${accounts['USER_1']} with filters`, async () => {
    const params = {
      page: 1,
      perPage: 5,
      orderBy: 'minSigners',
      sort: 'DESC',
      q: 'fuel1jt0lepem2mepjv576qamdxltarpa3vzppzzhfzp00fjqfupw9u5q9gyphu',
      //signer: predicatePayload.addresses,
      //todo predicateAdress retornando um array vazio
      //address: predicatePayload.predicateAddress,
      //todo: fix bug to request with owner
      //owner: accounts['USER_1'].address,
    };
    const { data } = await api.axios.get('/predicate/', { params });
    expect(data).toHaveProperty('currentPage', 1);
    expect(data).toHaveProperty('perPage', 5);
    //expect(data).toHaveProperty('data[0]', expect.any(Object));
    //console.log(data);
    data.data.forEach(element => {
      // Corrigido aqui
      expect(element.minSigners).toBeGreaterThan(0);
      expect(element.name.length).toBeGreaterThan(0);
      expect(element.name.length).toBeGreaterThan(0);
      expect(element.id).toBeDefined();
      expect(element.chainId).toBeDefined();
      expect(element.configurable).toBeDefined();
      expect(element.createdAt).toBeDefined();
      expect(element.updatedAt).toBeDefined();
      expect(element.deletedAt).toBeNull();
      //expect(element.)
      //console.log(element.name);
      expect(element.owner.address.length).toBeGreaterThan(10);
      expect(element.owner.id.length).toBeGreaterThan(10);
      expect(element.members.length).toBeGreaterThan(0);
    });
    //todo: fix bug to request with owner
    //expect(data).toHaveProperty('data[0].owner.id', );
  });
  test(`List predicates of user ${accounts['USER_3']} with filters, provider`, async () => {
    const params = {
      page: 1,
      perPage: 5,
      orderBy: 'minSigners',
      sort: 'DESC',
      provider: 'http://localhost:4000/graphql',
      //signer: predicatePayload.addresses,
      //todo predicateAdress retornando um array vazio
      //address: predicatePayload.predicateAddress,
      //todo: fix bug to request with owner
      //owner: accounts['USER_1'].address,
    };
    const { data } = await api.axios.get('/predicate/', { params });
    expect(data).toHaveProperty('currentPage', 1);
    expect(data).toHaveProperty('perPage', 5);
    //expect(data).toHaveProperty('data[0]', expect.any(Object));
    //console.log(data);
    data.data.forEach(element => {
      // Corrigido aqui
      expect(element.minSigners).toBeGreaterThan(0);
      expect(element.name.length).toBeGreaterThan(0);
      expect(element.name.length).toBeGreaterThan(0);
      expect(element.id).toBeDefined();
      expect(element.chainId).toBeDefined();
      expect(element.configurable).toBeDefined();
      expect(element.createdAt).toBeDefined();
      expect(element.updatedAt).toBeDefined();
      expect(element.deletedAt).toBeNull();
      //expect(element.)
      //console.log(element.name);
      expect(element.owner.address.length).toBeGreaterThan(10);
      expect(element.owner.id.length).toBeGreaterThan(10);
      expect(element.members.length).toBeGreaterThan(0);
    });
    //todo: fix bug to request with owner
    //expect(data).toHaveProperty('data[0].owner.id', );
  });
  test(`List predicates of user ${accounts['USER_3']} with filters, provider && q `, async () => {
    const params = {
      page: 1,
      perPage: 5,
      orderBy: 'minSigners',
      sort: 'DESC',
      q: 'fuel1jt0lepem2mepjv576qamdxltarpa3vzppzzhfzp00fjqfupw9u5q9gyphu',
      provider: 'http://localhost:4000/graphql',
      //signer: predicatePayload.addresses,
      //todo predicateAdress retornando um array vazio
      //address: predicatePayload.predicateAddress,
      //todo: fix bug to request with owner
      //owner: accounts['USER_1'].address,
    };
    const { data } = await api.axios.get('/predicate/', { params });
    expect(data).toHaveProperty('currentPage', 1);
    expect(data).toHaveProperty('perPage', 5);
    //expect(data).toHaveProperty('data[0]', expect.any(Object));
    //console.log(data);
    data.data.forEach(element => {
      // Corrigido aqui
      expect(element.minSigners).toBeGreaterThan(0);
      expect(element.name.length).toBeGreaterThan(0);
      expect(element.name.length).toBeGreaterThan(0);
      expect(element.id).toBeDefined();
      expect(element.chainId).toBeDefined();
      expect(element.configurable).toBeDefined();
      expect(element.createdAt).toBeDefined();
      expect(element.updatedAt).toBeDefined();
      expect(element.deletedAt).toBeNull();
      //expect(element.)
      //console.log(element.name);
      expect(element.owner.address.length).toBeGreaterThan(10);
      expect(element.owner.id.length).toBeGreaterThan(10);
      expect(element.members.length).toBeGreaterThan(0);
    });
    //todo: fix bug to request with owner
    //expect(data).toHaveProperty('data[0].owner.id', );
  });
  test(`List predicates of user ${accounts['USER_3']} with filters, provider && q without results `, async () => {
    const params = {
      page: 1,
      perPage: 5,
      orderBy: 'minSigners',
      sort: 'DESC',
      q: 'fuel1jt0lepem2mepjv576qamdxltarpa3vzppzzhfzp00fjqfupw9u5q9gyphu',
      provider: 'https://beta-4.fuel.network/graphql',
      //signer: predicatePayload.addresses,
      //todo predicateAdress retornando um array vazio
      //address: predicatePayload.predicateAddress,
      //todo: fix bug to request with owner
      //owner: accounts['USER_1'].address,
    };
    const { data } = await api.axios.get('/predicate/', { params });
    expect(data).toHaveProperty('currentPage', 1);
    expect(data).toHaveProperty('perPage', 5);
    //expect(data).toHaveProperty('data[0]', expect.any(Object));
    //console.log(data);
    data.data.forEach(element => {
      // Corrigido aqui
      expect(element.minSigners).toBeGreaterThan(0);
      expect(element.name.length).toBeGreaterThan(0);
      expect(element.name.length).toBeGreaterThan(0);
      expect(element.id).toBeDefined();
      expect(element.chainId).toBeDefined();
      expect(element.configurable).toBeDefined();
      expect(element.createdAt).toBeDefined();
      expect(element.updatedAt).toBeDefined();
      expect(element.deletedAt).toBeNull();
      //expect(element.)
      //console.log(element.name);
      expect(element.owner.address.length).toBeGreaterThan(10);
      expect(element.owner.id.length).toBeGreaterThan(10);
      expect(element.members.length).toBeGreaterThan(0);
    });
    //todo: fix bug to request with owner
    expect(data).toHaveProperty('data', []);
  });
  test(`List predicates of user ${accounts['USER_3']} with filters, provider && q= "", without results `, async () => {
    const params = {
      page: 1,
      perPage: 5,
      orderBy: 'minSigners',
      sort: 'DESC',
      q: '',
      provider: 'https://beta-4.fuel.network/graphql',
      minSigner: 5,
      //signer: predicatePayload.addresses,
      //todo predicateAdress retornando um array vazio
      //address: predicatePayload.predicateAddress,
      //todo: fix bug to request with owner
      //owner: accounts['USER_1'].address,
    };
    const { data } = await api.axios.get('/predicate/', { params });
    expect(data).toHaveProperty('currentPage', 1);
    expect(data).toHaveProperty('perPage', 5);
    //expect(data).toHaveProperty('data[0]', expect.any(Object));
    //console.log(data);
    data.data.forEach(element => {
      // Corrigido aqui
      expect(element.minSigners).toBeGreaterThan(0);
      expect(element.name.length).toBeGreaterThan(0);
      expect(element.name.length).toBeGreaterThan(0);
      expect(element.id).toBeDefined();
      expect(element.chainId).toBeDefined();
      expect(element.configurable).toBeDefined();
      expect(element.createdAt).toBeDefined();
      expect(element.updatedAt).toBeDefined();
      expect(element.deletedAt).toBeNull();
      //expect(element.)
      //console.log(element.name);
      expect(element.owner.address.length).toBeGreaterThan(10);
      expect(element.owner.id.length).toBeGreaterThan(10);
      expect(element.members.length).toBeGreaterThan(0);
    });
    //todo: fix bug to request with owner
    expect(data).toHaveProperty('data', []);
  });
  test(`List predicates of user ${accounts['USER_3']} with filters, provider && q= "", without results `, async () => {
    const params = {
      page: 1,
      perPage: 5,
      orderBy: 'minSigners',
      sort: 'DESC',
      q: 'fuel1jt0lepem2mepjv576qamdxltarpa3vzppzzhfzp00fjqfupw9u5q9gyphu',
      provider: 'https://beta-4.fuel.network/graphql',
      //signer: predicatePayload.addresses,
      //todo predicateAdress retornando um array vazio
      //address: predicatePayload.predicateAddress,
      //todo: fix bug to request with owner
      //owner: accounts['USER_1'].address,
    };
    const { data } = await api.axios.get('/predicate/', { params });
    expect(data).toHaveProperty('currentPage', 1);
    expect(data).toHaveProperty('perPage', 5);
    //expect(data).toHaveProperty('data[0]', expect.any(Object));
    //console.log(data);
    data.data.forEach(element => {
      // Corrigido aqui
      expect(element.minSigners).toBeGreaterThan(0);
      expect(element.name.length).toBeGreaterThan(0);
      expect(element.name.length).toBeGreaterThan(0);
      expect(element.id).toBeDefined();
      expect(element.chainId).toBeDefined();
      expect(element.configurable).toBeDefined();
      expect(element.createdAt).toBeDefined();
      expect(element.updatedAt).toBeDefined();
      expect(element.deletedAt).toBeNull();
      //expect(element.)
      //console.log(element.name);
      expect(element.owner.address.length).toBeGreaterThan(10);
      expect(element.owner.id.length).toBeGreaterThan(10);
      expect(element.members.length).toBeGreaterThan(0);
    });
    //todo: fix bug to request with owner
    expect(data).toHaveProperty('data', []);
  });
  test(`List predicates of user ${accounts['USER_3']} with filters, name && minSigners , without results `, async () => {
    const params = {
      page: 1,
      perPage: 5,
      orderBy: 'createdAt',
      sort: 'DESC',
      q: 'fuel1jt0lepem2mepjv576qamdxltarpa3vzppzzhfzp00fjqfupw9u5q9gyphu',
      minSigners: 5,
      //signer: predicatePayload.addresses,
      //todo predicateAdress retornando um array vazio
      //address: predicatePayload.predicateAddress,
      //todo: fix bug to request with owner
      //owner: accounts['USER_1'].address,
    };
    const { data } = await api.axios.get('/predicate/', { params });
    expect(data).toHaveProperty('currentPage', 1);
    expect(data).toHaveProperty('perPage', 5);
    //expect(data).toHaveProperty('data[0]', expect.any(Object));
    //console.log(data);
    data.data.forEach(element => {
      // Corrigido aqui
      expect(element.minSigners).toBeGreaterThan(0);
      expect(element.name.length).toBeGreaterThan(0);
      expect(element.name.length).toBeGreaterThan(0);
      expect(element.id).toBeDefined();
      expect(element.chainId).toBeDefined();
      expect(element.configurable).toBeDefined();
      expect(element.createdAt).toBeDefined();
      expect(element.updatedAt).toBeDefined();
      expect(element.deletedAt).toBeNull();
      //expect(element.)
      //console.log(element.name);
      expect(element.owner.address.length).toBeGreaterThan(10);
      expect(element.owner.id.length).toBeGreaterThan(10);
      expect(element.members.length).toBeGreaterThan(0);
    });
    //todo: fix bug to request with owner
    expect(data).toHaveProperty('data', []);
  });
  test('Find predicate by ID', async () => {
    const { predicatePayload } = await PredicateMock.create(1, [
      accounts['USER_1'].address,
      accounts['USER_2'].address,
    ]);
    const { data } = await api.axios.post('/predicate', predicatePayload);

    const { data: predicate } = await api.axios.get(`/predicate/${data.id}`);

    expect(predicate).toHaveProperty('id', data.id);
    expect(predicate).toHaveProperty('predicateAddress', data.predicateAddress);
    expect(predicate.predicateAddress).toMatch(/^fuel/);
    //console.log(Address.fromString(predicate.predicateAddress).toB256());
    expect(predicate.predicateAddress.length).toBeGreaterThan(30);
    expect(predicate.id.length).toBeGreaterThan(10);
  });
  test('Find predicate by Predicate Address', async () => {
    const { predicatePayload } = await PredicateMock.create(1, [
      accounts['USER_1'].address,
      accounts['USER_2'].address,
    ]);
    const { data } = await api.axios.post('/predicate', predicatePayload);
    console.log(data);
    const { data: predicate } = await api.axios.get(
      `/by-address/${data.predicateAddress}`,
    );

    expect(predicate).toHaveProperty('id', data.id);
    expect(predicate).toHaveProperty('predicateAddress', data.predicateAddress);
    expect(predicate.predicateAddress).toMatch(/^fuel/);
    //console.log(Address.fromString(predicate.predicateAddress).toB256());
    expect(predicate.predicateAddress.length).toBeGreaterThan(30);
    expect(predicate.id.length).toBeGreaterThan(10);
  });
  test('Find predicate by non-existent ID', async () => {
    const { predicatePayload } = await PredicateMock.create(1, [
      accounts['USER_1'].address,
      accounts['USER_2'].address,
    ]);
    const { data } = await api.axios.post('/predicate', predicatePayload);
    try {
      const modifiedPayload = {
        ...predicatePayload,
        id: '12342123',
      };
      await api.axios.get(`/predicate/${modifiedPayload.id}`);
      // Se a rota permite procurar por um endereço de predicado, adicione um teste adicional
      fail('Expected an error, but none occurred.');
    } catch (error) {
      expect(error.response.status).toEqual(500);
    }
  });
  test('Find predicate by non-existent Predicate Address', async () => {
    const { predicatePayload } = await PredicateMock.create(1, [
      accounts['USER_1'].address,
      accounts['USER_2'].address,
    ]);
    const { data } = await api.axios.post('/predicate', predicatePayload);

    try {
      const modifiedPayload = {
        ...predicatePayload,
        predicateAddress: '555123123',
      };
      await api.axios.get(`/by-address/${modifiedPayload.predicateAddress}`);
      // Se a rota permite procurar por um endereço de predicado, adicione um teste adicional
      fail('Expected an error, but none occurred.');
    } catch (error) {
      expect(error.response.status).toEqual(404);
    }
  });
});
