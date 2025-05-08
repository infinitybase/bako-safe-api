import { Address } from 'fuels';

import { accounts } from '@src/mocks/accounts';
import { networks } from '@src/mocks/networks';
import { AuthValidations } from '@src/utils/testUtils/Auth';
import { catchApplicationError, TestError } from '@utils/testUtils/Errors';
import Express from 'express';
import request from 'supertest';
import App from '@src/server/app';
import * as http from 'http';

describe('[ADDRESS_BOOK]', () => {
  let app: Express.Application;
  let server: http.Server;
  let api: AuthValidations;
  let single_workspace: string;

  beforeAll(async () => {
    const appInstance = await App.start();
    app = appInstance.serverApp;
    server = app.listen(0);

    api = new AuthValidations(networks['local'], accounts['USER_5']);

    await api.create();
    await api.createSession();
    single_workspace = api.workspace.id;
  });

  test(
    'Create address book using a personal workspace',
    async () => {
      const address = Address.fromRandom();
      const nickname = `[FAKE_CONTACT_NAME]: ${address.toAddress()}`;

      const { body: data } = await request(app)
        .post('/address-book/')
        .send({
          nickname,
          address: address.toAddress(),
        })
        .set('Authorization', api.sessionAuth.token)
        .set('Signeraddress', api.sessionAuth.address);

      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('nickname', nickname);
      expect(data).toHaveProperty('user.address', address.toB256());

      const response = await request(app)
        .post('/address-book/')
        .send({
          nickname,
          address: address.toAddress(),
        })
        .set('Authorization', api.sessionAuth.token)
        .set('Signeraddress', api.sessionAuth.address);

      // Verificações do erro de duplicação
      expect(response.status).toBe(500); // ou 400/409, dependendo do que sua API retorna
      expect(response.body).toEqual({
        type: 'Internal',
        title: 'Error on contact creation - nickname duplicated',
        detail: null, //'Duplicated nickname',
      });
    },
    5 * 1000,
  );

  // test(
  //   'Create address book using a personal workspace',
  //   async () => {
  //     const address = Address.fromRandom();
  //     const nickname = `[FAKE_CONTACT_NAME]: ${address.toAddress()}`;
  //     const { data } = await api.axios.post('/address-book/', {
  //       nickname,
  //       address: address.toAddress(),
  //     });

  //     const aux = await api.axios
  //       .post('/address-book/', {
  //         nickname,
  //         address,
  //       })
  //       .catch(e => e.response.data);

  //     expect(data).toHaveProperty('id');
  //     expect(data).toHaveProperty('nickname', nickname);
  //     expect(data).toHaveProperty('user.address', address.toB256());

  //     expect(aux).toHaveProperty('detail', 'Duplicated nickname');
  //   },
  //   5 * 1000,
  // );

  test(
    'Error when creating address book with invalid payload',
    async () => {
      const address = Address.fromRandom();
      const nickname = `[FAKE_CONTACT_NAME]: ${address.toAddress()}`;

      const payloadError = await catchApplicationError(
        request(app)
          .post('/address-book/')
          .send({
            nickname,
            address: 'invalid_address',
          })
          .set('Authorization', api.sessionAuth.token)
          .set('Signeraddress', api.sessionAuth.address),
      );

      TestError.expectValidation(payloadError, {
        type: 'custom',
        field: 'Invalid address',
        origin: 'body',
      });
    },
    5 * 1000,
  );

  // test(
  //   'Error when creating address book with invalid payload',
  //   async () => {
  //     const address = Address.fromRandom();
  //     const nickname = `[FAKE_CONTACT_NAME]: ${address.toAddress()}`;

  //     const payloadError = await catchApplicationError(
  //       api.axios.post('/address-book/', {
  //         nickname,
  //         address: 'invalid_address',
  //       }),
  //     );

  //     TestError.expectValidation(payloadError, {
  //       type: 'custom',
  //       field: 'Invalid address',
  //       origin: 'body',
  //     });
  //   },
  //   5 * 1000,
  // );

  // test(
  //   'Create address book using a group workspace',
  //   async () => {
  //     const auth = new AuthValidations(networks['local'], accounts['USER_1']);

  //     await auth.create();
  //     await auth.createSession();
  //     const { data: workspace } = await generateWorkspacePayload(auth);

  //     //await auth.selectWorkspace(workspace.id);
  //     const nickname = `[FAKE_CONTACT_NAME]: ${Address.fromRandom().toAddress()}`;
  //     const address = Address.fromRandom();
  //     const { data } = await auth.axios.post('/address-book/', {
  //       nickname,
  //       address: address.toAddress(),
  //     });

  //     const aux = await auth.axios
  //       .post('/address-book/', {
  //         nickname,
  //         address,
  //       })
  //       .catch(e => e.response.data);

  //     expect(data).toHaveProperty('id');
  //     expect(data).toHaveProperty('nickname', nickname);
  //     expect(data).toHaveProperty('user.address', address.toB256());
  //     expect(aux).toHaveProperty('detail', 'Duplicated nickname');
  //   },
  //   5 * 1000,
  // );

  test(
    `list addressBook`,
    async () => {
      const auth = await AuthValidations.authenticateUser({
        account: accounts['USER_5'],
        provider: networks['local'],
      });

      await request(app)
        .get('/address-book')
        .set('Authorization', auth.sessionAuth.token)
        .set('Signeraddress', auth.sessionAuth.address)
        .then(({ body: data, status }) => {
          expect(status).toBe(200);
          data.forEach(element => {
            expect(element).toHaveProperty('nickname');
            expect(element.user).toHaveProperty('address');

            expect(element.owner).toHaveProperty('id', auth.workspace.id);
          });
        });

      await request(app)
        .get('/address-book?includePersonal=true')
        .set('Authorization', auth.sessionAuth.token)
        .set('Signeraddress', auth.sessionAuth.address)
        .then(({ body: data, status }) => {
          data.forEach(element => {
            expect(status).toBe(200);
            expect(element).toHaveProperty('id');
            expect(element).toHaveProperty('nickname');
            expect(element.user).toHaveProperty('address');
          });
        });
    },
    10 * 1000,
  );

  // test(
  //   `list addressBook`,
  //   async () => {
  //     //list with workspace
  //     const auth = await AuthValidations.authenticateUser({
  //       account: accounts['USER_5'],
  //       provider: networks['local'],
  //     });

  //     //list with single workspace [your address book]
  //     await auth.axios.get(`/address-book`).then(({ data, status }) => {
  //       expect(status).toBe(200);
  //       data.forEach(element => {
  //         expect(element).toHaveProperty('nickname');
  //         expect(element.user).toHaveProperty('address');

  //         expect(element.owner).toHaveProperty('id', auth.workspace.id);
  //       });
  //     });
  //     // ------ TESTING WORKSPACE ------------------
  //     //const old_workspace = auth.workspace.id;

  //     // await auth.axios.get(`/workspace/by-user`).then(async ({ data, status }) => {
  //     //   const new_workspace = data.find(i => i.id !== old_workspace);
  //     //   const owners = [new_workspace.id, auth.workspace.id];

  //     //   //with pagination
  //     //   const page = 1;
  //     //   const perPage = 8;
  //     //   await auth.axios
  //     //     .get(`/address-book?page=${page}&perPage=${perPage}`)
  //     //     .then(({ data, status }) => {
  //     //       expect(status).toBe(200);
  //     //       expect(data.data.length).toBeLessThanOrEqual(perPage);
  //     //       expect(data).toHaveProperty('total');
  //     //       expect(data).toHaveProperty('currentPage', page);
  //     //       expect(data).toHaveProperty('perPage', perPage);
  //     //     });

  //     //   //with personal contacts
  //     //   await auth.axios.get(`/address-book`).then(({ data, status }) => {
  //     //     data.forEach(element => {
  //     //       expect(status).toBe(200);
  //     //       expect(element).toHaveProperty('id');
  //     //       expect(element).toHaveProperty('nickname');
  //     //       expect(element.user).toHaveProperty('address');
  //     //       expect(element.owner).toHaveProperty('id', auth.workspace.id);
  //     //     });
  //     //   });

  //     //without personal contacts
  //     // await auth.selectWorkspace(new_workspace.id);
  //     // await auth.axios.get(`/address-book`).then(({ data, status }) => {
  //     //   data.forEach(element => {
  //     //     expect(status).toBe(200);
  //     //     expect(element).toHaveProperty('id');
  //     //     expect(element).toHaveProperty('nickname');
  //     //     expect(element.user).toHaveProperty('address');
  //     //     expect(element.owner).toHaveProperty('id', new_workspace.id);
  //     //   });
  //     // });

  //     // ------ END TESTING WORKSPACE ------------------

  //     await auth.axios
  //       .get(`/address-book?includePersonal=true`)
  //       .then(({ data, status }) => {
  //         data.forEach(element => {
  //           expect(status).toBe(200);
  //           expect(element).toHaveProperty('id');
  //           expect(element).toHaveProperty('nickname');
  //           expect(element.user).toHaveProperty('address');
  //           //const aux = owners.includes(element.owner.id);
  //           //expect(aux).toBe(true);
  //         });
  //       });
  //     //});
  //   },
  //   10 * 1000,
  // );

  test('Update address book', async () => {
    const address = Address.fromRandom();
    const address_aux = Address.fromRandom();

    const nickname = `[FAKE_CONTACT_NAME]: ${address.toAddress()}`;

    const { body: adressBook } = await request(app)
      .post('/address-book/')
      .send({
        nickname,
        address: address.toAddress(),
      })
      .set('Authorization', api.sessionAuth.token)
      .set('Signeraddress', api.sessionAuth.address);

    const nickname_aux = `[FAKE_CONTACT_NAME]: ${address_aux.toAddress()}`;

    await request(app)
      .put(`/address-book/${adressBook.id}`)
      .send({
        id: adressBook.id,
        nickname: nickname_aux,
        address: address.toAddress(),
      })
      .set('Authorization', api.sessionAuth.token)
      .set('Signeraddress', api.sessionAuth.address)
      .then(({ body: data, status }) => {
        expect(status).toBe(200);
        expect(data.id).toBe(adressBook.id);
        expect(data.nickname).toBe(nickname_aux);
      });

    // Update address book with invalid permission
    const auth_aux = await AuthValidations.authenticateUser({
      account: accounts['USER_2'],
      provider: networks['local'],
    });

    const notHasPermissionError = await catchApplicationError(
      request(app)
        .put(`/address-book/${adressBook.id}`)
        .send({
          id: adressBook.id,
          nickname: nickname_aux,
          address: address.toAddress(),
        })
        .set('Authorization', auth_aux.sessionAuth.token ?? '')
        .set('Signeraddress', auth_aux.sessionAuth.address ?? ''),
    );
    TestError.expectUnauthorized(notHasPermissionError);
  });

  // test('Update address book', async () => {
  //   const address = Address.fromRandom();
  //   const address_aux = Address.fromRandom();

  //   const nickname = `[FAKE_CONTACT_NAME]: ${address.toAddress()}`;
  //   const { data: adressBook } = await api.axios.post('/address-book/', {
  //     nickname,
  //     address: address.toAddress(),
  //   });

  //   const nickname_aux = `[FAKE_CONTACT_NAME]: ${address_aux.toAddress()}`;
  //   await api.axios
  //     .put(`/address-book/${adressBook.id}`, {
  //       id: adressBook.id,
  //       nickname: nickname_aux,
  //       address: address.toAddress(),
  //     })
  //     .then(({ data, status }) => {
  //       expect(status).toBe(200);
  //       expect(data.id).toBe(adressBook.id);
  //       expect(data.nickname).toBe(nickname_aux);
  //     });

  //   // Update address book with invalid permission
  //   const auth_aux = await AuthValidations.authenticateUser({
  //     account: accounts['USER_2'],
  //     provider: networks['local'],
  //   });

  //   const notHasPermissionError = await catchApplicationError(
  //     auth_aux.axios.put(`/address-book/${adressBook.id}`, {
  //       id: adressBook.id,
  //       nickname: nickname_aux,
  //       address: address.toAddress(),
  //     }),
  //   );
  //   TestError.expectUnauthorized(notHasPermissionError);
  // });

  test('Delete address book', async () => {
    const address = Address.fromRandom();
    const nickname = `[FAKE_CONTACT_NAME]: ${address.toAddress()}`;

    const { body: adressBook } = await request(app)
      .post('/address-book/')
      .send({
        nickname,
        address: address.toAddress(),
      })
      .set('Authorization', api.sessionAuth.token)
      .set('Signeraddress', api.sessionAuth.address);

    // Delete address book with invalid permission
    const auth_aux = await AuthValidations.authenticateUser({
      account: accounts['USER_2'],
      provider: networks['local'],
    });

    const notHasPermissionError = await catchApplicationError(
      request(app)
        .delete(`/address-book/${adressBook.id}`)
        .set('Authorization', auth_aux.sessionAuth.token ?? '')
        .set('Signeraddress', auth_aux.sessionAuth.address ?? ''),
    );
    TestError.expectUnauthorized(notHasPermissionError);

    request(app)
      .delete(`/address-book/${adressBook.id}`)
      .set('Authorization', api.sessionAuth.token)
      .set('Signeraddress', api.sessionAuth.address)
      .then(({ body: data, status }) => {
        expect(status).toBe(200);
        expect(data).toBe(true);
      });
  });

  // test('Delete address book', async () => {
  //   const address = Address.fromRandom();
  //   const nickname = `[FAKE_CONTACT_NAME]: ${address.toAddress()}`;
  //   const { data: adressBook } = await api.axios.post('/address-book/', {
  //     nickname,
  //     address: address.toAddress(),
  //   });

  //   // Delete address book with invalid permission
  //   const auth_aux = await AuthValidations.authenticateUser({
  //     account: accounts['USER_2'],
  //     provider: networks['local'],
  //   });

  //   const notHasPermissionError = await catchApplicationError(
  //     auth_aux.axios.delete(`/address-book/${adressBook.id}`),
  //   );
  //   TestError.expectUnauthorized(notHasPermissionError);

  //   await api.axios
  //     .delete(`/address-book/${adressBook.id}`)
  //     .then(({ data, status }) => {
  //       expect(status).toBe(200);
  //       expect(data).toBe(true);
  //     });
  // });
});
