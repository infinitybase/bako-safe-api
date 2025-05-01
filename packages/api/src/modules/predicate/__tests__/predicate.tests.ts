import crypto from 'crypto';

import Express from 'express';
import request from 'supertest';
import App from '@src/server/app';
import * as http from 'http';
import { FuelProvider } from '@src/utils';

import { accounts } from '@src/mocks/accounts';
import { networks } from '@src/mocks/networks';
import { PredicateMock } from '@src/mocks/predicate';
import { predicateVersionMock } from '@src/mocks/predicateVersion';

import { AuthValidations } from '@src/utils/testUtils/Auth';
import { generateUser } from '@src/utils/testUtils/Workspace';

import { Address } from 'fuels';

import { catchApplicationError, TestError } from '@src/utils/testUtils/Errors';
import { Console } from 'console';
import e from 'express';

describe('[PREDICATE]', () => {
  let app: Express.Application;
  let server: http.Server;
  let api: AuthValidations;

  beforeAll(async () => {
    const appInstance = await App.start();
    app = appInstance.serverApp;
    server = app.listen(0);

    await FuelProvider.start();

    api = new AuthValidations(networks['local'], accounts['USER_5']);

    await api.create();
    await api.createSession();
  });

  test(
    'Create predicate without version code',
    async () => {
      const data_user1 = await generateUser(api, app);
      const data_user2 = await generateUser(api, app);
      const members = [data_user1.address, data_user2.address];
      const { predicatePayload } = await PredicateMock.create(1, members);

      const { body: data } = await request(app)
        .post('/predicate')
        .send(predicatePayload)
        .set('Authorization', api.sessionAuth.token)
        .set('Signeraddress', api.sessionAuth.address);

      //predicate validation
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty(
        'predicateAddress',
        new Address(predicatePayload.predicateAddress).toB256(),
      );
      expect(data).toHaveProperty('name', predicatePayload.name);
      expect(data).toHaveProperty('description', predicatePayload.description);
      expect(data).toHaveProperty('configurable', predicatePayload.configurable);
      expect(data).toHaveProperty('owner.address', accounts['USER_5'].address);
      expect(data.members.length).toBe(2);
      expect(data.members[0]).toHaveProperty('avatar');
      expect(data.members[0]).toHaveProperty('address');
      expect(data.members[0]).toHaveProperty('type');
    },
    10 * 1000,
  );

  // // test(
  // //   'Create predicate without version code',
  // //   async () => {
  // //     //const { data_user1, data_user2 } = await generateWorkspacePayload(api);
  // //     const data_user1 = await generateUser(api, app);
  // //     const data_user2 = await generateUser(api, app);
  // //     const members = [data_user1.address, data_user2.address];
  // //     const { predicatePayload } = await PredicateMock.create(1, members);

  // //     const { data } = await api.axios.post('/predicate', predicatePayload);

  // //     // const { data: workspace } = await api.axios.get(
  // //     //   `/workspace/${api.workspace.id}`,
  // //     // );

  // //     //predicate validation
  // //     expect(data).toHaveProperty('id');
  // //     expect(data).toHaveProperty(
  // //       'predicateAddress',
  // //       Address.fromString(predicatePayload.predicateAddress).toB256(),
  // //     );
  // //     //expect(data).toHaveProperty('owner.address', accounts['USER_5'].account);
  // //     expect(data).toHaveProperty('owner.address', accounts['USER_5'].address);
  // //     // NAO ESTA MAIS SENDO PEGO QUANDO CRIA
  // //     // expect(data).toHaveProperty('version.id');
  // //     // expect(data).toHaveProperty('version.abi');
  // //     // expect(data).toHaveProperty('version.bytes');
  // //     // expect(data).toHaveProperty('version.code');

  // //     //permissions validation
  // //     // expect(
  // //     //   workspace.permissions[data_user1.id][PermissionRoles.SIGNER],
  // //     // ).toContain(data.id);
  // //     // expect(
  // //     //   workspace.permissions[data_user2.id][PermissionRoles.SIGNER],
  // //     // ).toContain(data.id);
  // //   },
  // //   10 * 1000,
  // // );

  test(
    'Create predicate with version code',
    async () => {
      const data_user1 = await generateUser(api, app);
      const data_user2 = await generateUser(api, app);
      const members = [data_user1.address, data_user2.address];
      const { predicatePayload } = await PredicateMock.create(1, members);

      const { body: data } = await request(app)
        .post('/predicate')
        .send({
          ...predicatePayload,
          version: predicateVersionMock.code,
        })
        .set('Authorization', api.sessionAuth.token)
        .set('Signeraddress', api.sessionAuth.address);

      //predicate validation
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty(
        'predicateAddress',
        new Address(predicatePayload.predicateAddress).toB256(),
      );
      expect(data).toHaveProperty('name', predicatePayload.name);
      expect(data).toHaveProperty('description', predicatePayload.description);
      expect(data).toHaveProperty('configurable', predicatePayload.configurable);
      expect(data).toHaveProperty('owner.address', accounts['USER_5'].address);
      expect(data.members.length).toBe(2);
      expect(data.members[0]).toHaveProperty('avatar');
      expect(data.members[0]).toHaveProperty('address');
      expect(data.members[0]).toHaveProperty('type');
    },
    10 * 1000,
  );

  // // test(
  // //   'Create predicate with version code',
  // //   async () => {
  // //     // const { data_user1, data_user2 } = await generateWorkspacePayload(api);
  // //     const data_user1 = await generateUser(api, app);
  // //     const data_user2 = await generateUser(api, app);
  // //     const members = [data_user1.address, data_user2.address];
  // //     const { predicatePayload } = await PredicateMock.create(1, members);

  // //     const { data } = await api.axios.post('/predicate', {
  // //       ...predicatePayload,
  // //       //versionCode: predicateVersionMock.code,
  // //       version: predicateVersionMock.code,
  // //     });

  // //     // const { data: workspace } = await api.axios.get(
  // //     //   `/workspace/${api.workspace.id}`,
  // //     // );

  // //     //predicate validation
  // //     expect(data).toHaveProperty('id');
  // //     expect(data).toHaveProperty(
  // //       'predicateAddress',
  // //       Address.fromString(predicatePayload.predicateAddress).toB256(),
  // //     );
  // //     //expect(data).toHaveProperty('owner.address', accounts['USER_1'].account);
  // //     expect(data).toHaveProperty('owner.address', accounts['USER_5'].address);

  // //     // NAO TA SENDO PEGO QUANDO CRIA
  // //     //expect(data).toHaveProperty('version', predicateVersionMock.code);

  // //     // NEM TEM MAIS ESSE VERSION COM ATRIBTUOS.
  // //     // expect(data).toHaveProperty('version.id');
  // //     // expect(data).toHaveProperty('version.abi');
  // //     // expect(data).toHaveProperty('version.bytes');
  // //     // expect(data).toHaveProperty('version.code');

  // //     //permissions validation
  // //     // expect(
  // //     //   workspace.permissions[data_user1.id][PermissionRoles.SIGNER],
  // //     // ).toContain(data.id);
  // //     // expect(
  // //     //   workspace.permissions[data_user2.id][PermissionRoles.SIGNER],
  // //     // ).toContain(data.id);
  // //   },
  // //   10 * 1000,
  // // );

  // //   // test('Create predicate with invalid owner permission', async () => {
  // //   //   const auth = new AuthValidations(networks['local'], accounts['USER_1']);
  // //   //   await auth.create();
  // //   //   await auth.createSession();

  // //   //   //create a new workspace
  // //   //   const { data: data_workspace } = await generateWorkspacePayload(auth);

  // //   //   //auth with new account
  // //   //   const auth_aux = new AuthValidations(networks['local'], accounts['USER_5']);
  // //   //   await auth_aux.create();
  // //   //   await auth_aux.createSession();
  // //   //   await auth_aux.selectWorkspace(data_workspace.id);

  // //   //   const { predicatePayload } = await PredicateMock.create(1, [
  // //   //     accounts['USER_1'].address,
  // //   //     accounts['USER_2'].address,
  // //   //     accounts['USER_3'].address,
  // //   //   ]);

  // //   //   const { status, data: predicate_data } = await auth_aux.axios
  // //   //     .post('/predicate', predicatePayload)
  // //   //     .catch(e => {
  // //   //       return e.response;
  // //   //     });

  // //   //   expect(status).toBe(401);
  // //   //   expect(predicate_data.errors.detail).toEqual(
  // //   //     'You do not have permission to access this resource',
  // //   //   );
  // //   // });

  test(
    'List predicates',
    async () => {
      const auth = await AuthValidations.authenticateUser({
        account: accounts['USER_5'],
        provider: networks['local'],
      });

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
      await request(app)
        .get('/predicate')
        .set('Authorization', auth.sessionAuth.token)
        .set('Signeraddress', auth.sessionAuth.address)
        .then(({ body: data, status }) => {
          expect(status).toBe(200);
          data.data.forEach(element => {
            expect(element).toHaveProperty('id');
            expect(element).toHaveProperty('members');
            expect(element).toHaveProperty('owner');

            const idValid =
              !!validateListSingle([...element.members, element.owner]) ||
              !!element.workspace.permissions[auth.user.id];
            expect(idValid).toBe(true);
          });
        });

      //with pagination
      const page = 1;
      const perPage = 8;
      await request(app)
        .get(`/predicate?page=${page}&perPage=${perPage}`)
        .set('Authorization', auth.sessionAuth.token)
        .set('Signeraddress', auth.sessionAuth.address)
        .then(({ body: data, status }) => {
          expect(status).toBe(200);
          expect(data).toHaveProperty('data');
          expect(data.data.length).toBeLessThanOrEqual(perPage);
          expect(data).toHaveProperty('total');
          expect(data).toHaveProperty('currentPage', page);
          expect(data).toHaveProperty('perPage', perPage);
        });
    },
    10 * 1000,
  );

  // // test(
  // //   'List predicates',
  // //   async () => {
  // //     const auth = await AuthValidations.authenticateUser({
  // //       account: accounts['USER_5'],
  // //       provider: networks['local'],
  // //     });

  // //     type predicateMember = {
  // //       id: string;
  // //       address: string;
  // //       avatar: string;
  // //     };

  // //     //on single workspace -> find by this user has signer
  // //     // if member or signer or included on workspace of vault
  // //     const validateListSingle = (members: predicateMember[]) => {
  // //       return members.find(m => {
  // //         return (
  // //           m.id == auth.user.id &&
  // //           m.address == auth.user.address &&
  // //           m.avatar == auth.user.avatar
  // //         );
  // //       });
  // //     };

  // //     await auth.axios.get('/predicate').then(({ data, status }) => {
  // //       expect(status).toBe(200);
  // //       data.data.forEach(element => {
  // //         const idValid =
  // //           !!validateListSingle([...element.members, element.owner]) ||
  // //           !!element.workspace.permissions[auth.user.id];
  // //         expect(element).toHaveProperty('id');
  // //         expect(idValid).toBe(true);
  // //       });
  // //     });

  // //     //with pagination
  // //     const page = 1;
  // //     const perPage = 8;
  // //     await auth.axios
  // //       .get(`/predicate?page=${page}&perPage=${perPage}`)
  // //       .then(({ data, status }) => {
  // //         expect(status).toBe(200);
  // //         expect(data).toHaveProperty('data');
  // //         expect(data.data.length).toBeLessThanOrEqual(perPage);
  // //         expect(data).toHaveProperty('total');
  // //         expect(data).toHaveProperty('currentPage', page);
  // //         expect(data).toHaveProperty('perPage', perPage);
  // //       });

  // //     //an another workspace
  // //     // const { data: data_workspace } = await generateWorkspacePayload(auth);
  // //     // await auth.selectWorkspace(data_workspace.id);
  // //     // await auth.axios.get('/predicate').then(({ data, status }) => {
  // //     //   expect(status).toBe(200);
  // //     //   expect(data).toHaveLength(0);
  // //     // });
  // //   },
  // //   10 * 1000,
  // // );

  test('Find predicate by id', async () => {
    const auth = await AuthValidations.authenticateUser({
      account: accounts['USER_4'],
      provider: networks['local'],
    });

    const data_user1 = await generateUser(auth, app);
    const data_user2 = await generateUser(auth, app);
    const USER_5 = await generateUser(auth, app, 'USER_5');

    //create a vault
    const members = [USER_5.address, data_user1.address, data_user2.address];

    const { predicatePayload } = await PredicateMock.create(3, members);

    const { body: data_predicate } = await request(app)
      .post('/predicate')
      .send(predicatePayload)
      .set('Authorization', auth.sessionAuth.token)
      .set('Signeraddress', auth.sessionAuth.address);

    await request(app)
      .get(`/predicate/${data_predicate.id}`)
      .set('Authorization', auth.sessionAuth.token)
      .set('Signeraddress', auth.sessionAuth.address)
      .then(({ body: data, status }) => {
        const { members, id } = data;

        expect(status).toBe(200);
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty(
          'predicateAddress',
          new Address(data_predicate.predicateAddress).toB256(),
        );
        expect(data).toHaveProperty('name', predicatePayload.name);
        expect(data).toHaveProperty('description', predicatePayload.description);
        expect(data).toHaveProperty('configurable', predicatePayload.configurable);
        expect(data.members.length).toBe(3);
        expect(data.members[0]).toHaveProperty('address');

        //validate members
        members.forEach(element => {
          const aux = members.find(m => element.id === m.id);
          expect(!!aux).toBe(true);
        });

        //validate vault
        expect(id).toBe(data_predicate.id);
      });

    // Find predicate by id with invalid permission
    const auth_aux = await AuthValidations.authenticateUser({
      account: accounts['USER_2'],
      provider: networks['local'],
    });

    const notHasPermissionError = await catchApplicationError(
      request(app)
        .get(`/predicate/${data_predicate.id}`)
        .set('Authorization', auth_aux.sessionAuth.token ?? '')
        .set('Signeraddress', auth_aux.sessionAuth.address ?? ''),
    );
    TestError.expectUnauthorized(notHasPermissionError);
  });

  // // test('Find predicate by id', async () => {
  // //   const auth = await AuthValidations.authenticateUser({
  // //     account: accounts['USER_4'],
  // //     provider: networks['local'],
  // //   });

  // //   //create a new workspace
  // //   // const {
  // //   //   data: data_workspace,
  // //   //   USER_5,
  // //   //   data_user1,
  // //   //   data_user2,
  // //   // } = await generateWorkspacePayload(auth);
  // //   //await auth.selectWorkspace(data_workspace.id);

  // //   //create a new nicknames
  // //   // const { data: n_data5 } = await auth.axios.post('/address-book/', {
  // //   //   address: USER_5.address,
  // //   //   nickname: `[TESTE]${USER_5.address}${new Date().getTime()}`,
  // //   // });
  // //   // const { data: n_data1 } = await auth.axios.post('/address-book/', {
  // //   //   address: data_user1.address,
  // //   //   nickname: `[TESTE]${data_user1.address}${new Date().getTime()}`,
  // //   // });
  // //   // const { data: n_data2 } = await auth.axios.post('/address-book/', {
  // //   //   address: data_user2.address,
  // //   //   nickname: `[TESTE]${data_user2.address}${new Date().getTime()}`,
  // //   // });

  // //   const data_user1 = await generateUser(auth, app);
  // //   const data_user2 = await generateUser(auth, app);
  // //   const USER_5 = await generateUser(auth, app, 'USER_5');

  // //   //create a vault
  // //   const members = [USER_5.address, data_user1.address, data_user2.address];

  // //   const { predicatePayload } = await PredicateMock.create(3, members);
  // //   const { data: data_predicate } = await auth.axios.post(
  // //     '/predicate',
  // //     predicatePayload,
  // //   );

  // //   await auth.axios
  // //     .get(`/predicate/${data_predicate.id}`)
  // //     .then(({ data, status }) => {
  // //       const { workspace, members, id } = data;
  // //       //const n_members = [n_data2.nickname, n_data1.nickname, n_data5.nickname];

  // //       expect(status).toBe(200);
  // //       expect(data).toHaveProperty('id');
  // //       // NEM TEMPOS MAIS ESSE ATRIBUTOS NO VERSION
  // //       // expect(data).toHaveProperty('version.id');
  // //       // expect(data).toHaveProperty('version.abi');
  // //       // expect(data).toHaveProperty('version.bytes');
  // //       // expect(data).toHaveProperty('version.code');

  // //       //validate workspace members
  // //       // workspace.addressBook.forEach(element => {
  // //       //   const aux = n_members.includes(element.nickname);
  // //       //   expect(aux).toBe(true);
  // //       // });

  // //       //validate members
  // //       members.forEach(element => {
  // //         const aux = members.find(m => element.id === m.id);
  // //         expect(!!aux).toBe(true);
  // //       });

  // //       //validate vault
  // //       expect(id).toBe(data_predicate.id);
  // //     });

  // //   // Find predicate by id with invalid permission
  // //   const auth_aux = await AuthValidations.authenticateUser({
  // //     account: accounts['USER_2'],
  // //     provider: networks['local'],
  // //   });

  // //   const notHasPermissionError = await catchApplicationError(
  // //     auth_aux.axios(`/predicate/${data_predicate.id}`),
  // //   );
  // //   TestError.expectUnauthorized(notHasPermissionError);
  // // });

  test('Find predicate by name and verify if exists in workspace', async () => {
    const auth = await AuthValidations.authenticateUser({
      account: accounts['USER_5'],
      provider: networks['local'],
    });

    const data_user1 = await generateUser(auth, app);
    const data_user2 = await generateUser(auth, app);
    const members = [data_user1.address, data_user2.address];
    const { predicatePayload } = await PredicateMock.create(1, members);

    const { body: predicate } = await request(app)
      .post('/predicate')
      .send(predicatePayload)
      .set('Authorization', auth.sessionAuth.token)
      .set('Signeraddress', auth.sessionAuth.address);

    //find a used name
    await request(app)
      .get(`/predicate/by-name/${predicate.name}`)
      .set('Authorization', auth.sessionAuth.token)
      .set('Signeraddress', auth.sessionAuth.address)
      .then(({ body: data, status }) => {
        expect(status).toBe(200);
        expect(data).toBe(true);
      });

    //find a unused name
    await request(app)
      .get(`/predicate/by-name/${crypto.randomUUID()}`)
      .set('Authorization', auth.sessionAuth.token)
      .set('Signeraddress', auth.sessionAuth.address)
      .then(({ body: data, status }) => {
        expect(status).toBe(200);
        expect(data).toBe(false);
      });
  });

  // // test('Find predicate by name and verify if exists in workspace', async () => {
  // //   const auth = await AuthValidations.authenticateUser({
  // //     account: accounts['USER_1'],
  // //     provider: networks['local'],
  // //   });

  // //   // const {
  // //   //   data_user1,
  // //   //   data_user2,
  // //   //   data: workspace,
  // //   // } = await generateWorkspacePayload(auth);
  // //   const data_user1 = await generateUser(auth, app);
  // //  const data_user2 = await generateUser(auth, app);
  // //   const members = [data_user1.address, data_user2.address];
  // //   const { predicatePayload } = await PredicateMock.create(1, members);

  // //   const { data: predicate } = await auth.axios.post(
  // //     '/predicate',
  // //     predicatePayload,
  // //   );

  // //   //find a used name
  // //   await auth
  // //     .axios(`/predicate/by-name/${predicate.name}`)
  // //     .then(({ data, status }) => {
  // //       expect(status).toBe(200);
  // //       expect(data).toBe(true);
  // //     });

  // //   //find a unused name
  // //   await auth
  // //     .axios(`/predicate/by-name/${crypto.randomUUID()}`)
  // //     .then(({ data, status }) => {
  // //       expect(status).toBe(200);
  // //       expect(data).toBe(false);
  // //     });

  // //   //find a used name in annother workspace
  // //   // await auth.selectWorkspace(workspace.id);
  // //   // await auth
  // //   //   .axios(`/predicate/by-name/${predicate.name}`)
  // //   //   .then(({ data, status }) => {
  // //   //     expect(status).toBe(200);
  // //   //     expect(data).toBe(false);
  // //   //   });
  // // });

  test('Get predicate balance', async () => {
    const auth = await AuthValidations.authenticateUser({
      account: accounts['USER_5'],
      provider: networks['local'],
    });

    const data_user1 = await generateUser(auth, app);
    const members = [data_user1.address];
    const { predicatePayload } = await PredicateMock.create(1, members);

    const { body: predicate } = await request(app)
      .post('/predicate')
      .send(predicatePayload)
      .set('Authorization', auth.sessionAuth.token)
      .set('Signeraddress', auth.sessionAuth.address);

    await request(app)
      .get(`/predicate/reserved-coins/${predicate.id}`)
      .set('Authorization', auth.sessionAuth.token)
      .set('Signeraddress', auth.sessionAuth.address)
      .then(({ body: data, status }) => {
        expect(status).toBe(200);
        expect(data).toHaveProperty('reservedCoinsUSD');
        expect(data).toHaveProperty('totalBalanceUSD');
        expect(data).toHaveProperty('currentBalanceUSD');
        expect(data).toHaveProperty('currentBalance');
        expect(data).toHaveProperty('totalBalance');
        expect(data).toHaveProperty('reservedCoins');
      });

    // Get predicate balance with invalid permission
    const auth_aux = await AuthValidations.authenticateUser({
      account: accounts['USER_2'],
      provider: networks['local'],
    });

    const notHasPermissionError = await catchApplicationError(
      request(app)
        .get(`/predicate/reserved-coins/${predicate.id}`)
        .set('Authorization', auth_aux.sessionAuth.token ?? '')
        .set('Signeraddress', auth_aux.sessionAuth.address ?? ''),
    );
    TestError.expectUnauthorized(notHasPermissionError);
  });

  // // test('Get predicate balance', async () => {
  // //   const auth = await AuthValidations.authenticateUser({
  // //     account: accounts['USER_5'],
  // //     provider: networks['local'],
  // //   });

  // //   const data_user1 = await generateUser(auth, app);
  // //   const members = [data_user1.address];
  // //   const { predicatePayload } = await PredicateMock.create(1, members);

  // //   const { data: predicate } = await auth.axios.post(
  // //     '/predicate',
  // //     predicatePayload,
  // //   );

  // //   await auth
  // //     .axios(`/predicate/reserved-coins/${predicate.id}`)
  // //     .then(({ data, status }) => {
  // //       expect(status).toBe(200);
  // //       expect(data).toHaveProperty('reservedCoinsUSD');
  // //       expect(data).toHaveProperty('totalBalanceUSD');
  // //       expect(data).toHaveProperty('currentBalanceUSD');
  // //       expect(data).toHaveProperty('currentBalance');
  // //       expect(data).toHaveProperty('totalBalance');
  // //       expect(data).toHaveProperty('reservedCoins');
  // //     });

  // //   // Get predicate balance with invalid permission
  // //   const auth_aux = await AuthValidations.authenticateUser({
  // //     account: accounts['USER_2'],
  // //     provider: networks['local'],
  // //   });

  // //   const notHasPermissionError = await catchApplicationError(
  // //     auth_aux.axios(`/predicate/reserved-coins/${predicate.id}`),
  // //   );
  // //   TestError.expectUnauthorized(notHasPermissionError);
  // // });

  test('Find predicate by address', async () => {
    const auth = await AuthValidations.authenticateUser({
      account: accounts['USER_5'],
      provider: networks['local'],
    });

    const data_user1 = await generateUser(auth, app);
    const members = [data_user1.address];
    const { predicatePayload } = await PredicateMock.create(1, members);

    const { body: predicate } = await request(app)
      .post('/predicate')
      .send(predicatePayload)
      .set('Authorization', auth.sessionAuth.token)
      .set('Signeraddress', auth.sessionAuth.address);

    await request(app)
      .get(`/predicate/by-address/${predicate.predicateAddress}`)
      .set('Authorization', auth.sessionAuth.token)
      .set('Signeraddress', auth.sessionAuth.address)
      .then(({ body: data, status }) => {
        expect(status).toBe(200);
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('configurable');
        expect(data).toHaveProperty('name');
        expect(data).toHaveProperty('description');
        expect(data).toHaveProperty('owner');
        expect(data).toHaveProperty('members');
        expect(data.members).toHaveLength(1);
      });

    // Find predicate by address with invalid permission
    const auth_aux = await AuthValidations.authenticateUser({
      account: accounts['USER_2'],
      provider: networks['local'],
    });

    const notHasPermissionError = await catchApplicationError(
      request(app)
        .get(`/predicate/by-address/${predicate.predicateAddress}`)
        .set('Authorization', auth_aux.sessionAuth.token ?? '')
        .set('Signeraddress', auth_aux.sessionAuth.address ?? ''),
    );
    TestError.expectUnauthorized(notHasPermissionError);
  });

  // // test('Find predicate by address', async () => {
  // //   const auth = await AuthValidations.authenticateUser({
  // //     account: accounts['USER_5'],
  // //     provider: networks['local'],
  // //   });

  // //   const data_user1 = await generateUser(auth, app);
  // //   const members = [data_user1.address];
  // //   const { predicatePayload } = await PredicateMock.create(1, members);

  // //   const { data: predicate } = await auth.axios.post(
  // //     '/predicate',
  // //     predicatePayload,
  // //   );

  // //   await auth
  // //     .axios(`/predicate/by-address/${predicate.predicateAddress}`)
  // //     .then(({ data, status }) => {
  // //       expect(status).toBe(200);
  // //       expect(data).toHaveProperty('id');
  // //       expect(data).toHaveProperty('configurable');
  // //       expect(data).toHaveProperty('name');
  // //       expect(data).toHaveProperty('description');
  // //     });

  // //   // Find predicate by address with invalid permission
  // //   const auth_aux = await AuthValidations.authenticateUser({
  // //     account: accounts['USER_2'],
  // //     provider: networks['local'],
  // //   });

  // //   const notHasPermissionError = await catchApplicationError(
  // //     auth_aux.axios(`/predicate/by-address/${predicate.predicateAddress}`),
  // //   );
  // //   TestError.expectUnauthorized(notHasPermissionError);
  // // });
});
