import axios from 'axios';

import crypto from 'crypto';
import { Address, Provider } from 'fuels';

import { networks } from '@src/mocks/networks';
import { RecoverCodeType, TypeUser } from '@src/models';
import { AuthValidations } from '@src/utils/testUtils/Auth';
import Express from 'express';
import { accounts } from '../../../mocks/accounts';
import request from 'supertest';
import App from '@src/server/app';
import * as http from 'http';
import Bootstrap from '@src/server/bootstrap';

const { API_URL, UI_URL } = process.env;

describe('[USER]', () => {
  let api = beforeAll(() => {
    api = axios.create({
      baseURL: API_URL,
    });
  });
  let app: Express.Application;
  let server: http.Server;

  beforeAll(async () => {
    const appInstance = await App.start();
    app = appInstance.serverApp;
    server = app.listen(0);
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close(err => {
        if (err) reject(err);
        else resolve();
      });
    });

    await Bootstrap.stop();
  });

  test(
    'Create user',
    async () => {
      const address = Address.fromRandom();
      const code_length = `code${address.toHexString()}`.length;

      await request(app)
        .post('/user/')
        .send({
          name: `${new Date().getTime()} - Create user test`,
          type: TypeUser.FUEL,
          address: address.toAddress(),
          provider: networks['local'],
        })
        .then(({ body: data, status }) => {
          expect(status).toBe(201);
          expect(data).toHaveProperty('id');
          expect(data).toHaveProperty('type', RecoverCodeType.AUTH);
          expect(data).toHaveProperty('origin', UI_URL);
          expect(data).toHaveProperty('code');
          expect(data.code.length).toBe(code_length);
        });
    },
    40 * 1000,
  );

  // test(
  //   'Create user',
  //   async () => {
  //     const address = Address.fromRandom();
  //     const code_length = `code${address.toHexString()}`.length;
  //     await api
  //       .post('/user/', {
  //         name: `${new Date().getTime()} - Create user test`,
  //         type: TypeUser.FUEL,
  //         address: address.toAddress(),
  //         provider: networks['local'],
  //       })
  //       .then(({ data, status }) => {
  //         expect(status).toBe(201);
  //         expect(data).toHaveProperty('id');
  //         expect(data).toHaveProperty('type', RecoverCodeType.AUTH);
  //         expect(data).toHaveProperty('origin', UI_URL);
  //         expect(data).toHaveProperty('code');
  //         expect(data.code.length).toBe(code_length);
  //       });
  //   },
  //   40 * 1000,
  // );

  test(
    'Error when creating user with invalid payload',
    async () => {
      // expect.assertions(3);

      await request(app)
        .post('/user/')
        .send({
          name: `${new Date().getTime()} - Create user test`,
          type: TypeUser.FUEL,
          address: 'invalid_address',
          provider: networks['local'],
        })
        .catch(reason => {
          const { response } = reason;
          expect(response.status).toBe(400);
          expect(response.data.origin).toBe('body');
          expect(response.data.errors).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                title: 'Invalid address',
                detail: 'Invalid address',
              }),
            ]),
          );
        });
    },
    40 * 1000,
  );

  // test(
  //   'Error when creating user with invalid payload',
  //   async () => {
  //     expect.assertions(3);
  //     await api
  //       .post('/user/', {
  //         name: `${new Date().getTime()} - Create user test`,
  //         type: TypeUser.FUEL,
  //         address: 'invalid_address',
  //         provider: networks['local'],
  //       })
  //       .catch(reason => {
  //         const { response } = reason;
  //         expect(response.status).toBe(400);
  //         expect(response.data.origin).toBe('body');
  //         expect(response.data.errors).toEqual(
  //           expect.arrayContaining([
  //             expect.objectContaining({
  //               title: 'Invalid address',
  //               detail: 'Invalid address',
  //             }),
  //           ]),
  //         );
  //       });
  //   },
  //   40 * 1000,
  // );

  test(
    'Home endpoint',
    async () => {
      const authUser = await AuthValidations.authenticateUser({
        account: accounts['USER_5'],
        provider: networks['local'],
      });

      const { token, address } = authUser.sessionAuth;

      // console.log(">>> auth", auth);

      //get user info
      //await auth.axios.get('user/latest/info')
      await request(app)
        .get('/user/latest/info')
        .set('Authorization', token)
        .set('Signeraddress', address)
        .then(({ body: data, status }) => {
          expect(status).toBe(200);
          expect(data).toHaveProperty('id');
          expect(data).toHaveProperty('name');
          expect(data).toHaveProperty('type');
          expect(data).toHaveProperty('avatar');
          expect(data).toHaveProperty('address');
          expect(data).toHaveProperty('webauthn');
          expect(data).toHaveProperty('onSingleWorkspace');
          expect(data).toHaveProperty('workspace');
        });
    },
    10 * 1000,
  );

  // test(
  //   'Home endpoint',
  //   async () => {
  //     const auth = await AuthValidations.authenticateUser({
  //       account: accounts['USER_5'],
  //       provider: networks['local'],
  //     });

  //     //get user info
  //     await auth.axios.get('user/latest/info').then(({ data, status }) => {
  //       expect(status).toBe(200);
  //       expect(data).toHaveProperty('id');
  //       expect(data).toHaveProperty('name');
  //       expect(data).toHaveProperty('type');
  //       expect(data).toHaveProperty('avatar');
  //       expect(data).toHaveProperty('address');
  //       expect(data).toHaveProperty('webauthn');
  //       expect(data).toHaveProperty('onSingleWorkspace');
  //       expect(data).toHaveProperty('workspace');
  //     });
  //   },
  //   10 * 1000,
  // );

  test('Home predicates endpoint', async () => {
    const authUser = await AuthValidations.authenticateUser({
      account: accounts['USER_5'],
      provider: networks['local'],
    });

    const { token, address } = authUser.sessionAuth;

    //list all predicates from user
    await request(app)
      .get('/user/predicates')
      .set('Authorization', token)
      .set('Signeraddress', address)
      .then(({ body: data, status }) => {
        expect(status).toBe(200);
        expect(data).toHaveProperty('predicates');
        expect(data.predicates.data.length).toBeLessThanOrEqual(8);
      });
  });

  // test('Home predicates endpoint', async () => {
  //   const auth = await AuthValidations.authenticateUser({
  //     account: accounts['USER_5'],
  //     provider: networks['local'],
  //   });

  //   //list all predicates from user
  //   await auth.axios.get('user/predicates').then(({ data, status }) => {
  //     expect(status).toBe(200);
  //     expect(data).toHaveProperty('predicates');
  //     expect(data.predicates.data.length).toBeLessThanOrEqual(8);
  //   });
  // });

  test('Home Transactions endpoint', async () => {
    const authUser = await AuthValidations.authenticateUser({
      account: accounts['USER_5'],
      provider: networks['local'],
    });

    const { token, address } = authUser.sessionAuth;

    //list all transactions by month,
    await request(app)
      .get('/user/latest/transactions')
      .set('Authorization', token)
      .set('Signeraddress', address)
      .then(({ body: data, status }) => {
        expect(status).toBe(200);
        expect(data).toHaveProperty('data');
        expect(data.data).toBeInstanceOf(Array);
      });
  });

  // test('Home Transactions endpoint', async () => {
  //   const auth = await AuthValidations.authenticateUser({
  //     account: accounts['USER_5'],
  //     provider: networks['local'],
  //   });

  //   //list all transactions by month,
  //   await auth.axios.get('user/latest/transactions').then(({ data, status }) => {
  //     expect(status).toBe(200);
  //     expect(data).toHaveProperty('data');
  //     expect(data.data).toBeInstanceOf(Array);
  //   });
  // });

  test('Update user', async () => {
    const auth = await AuthValidations.authenticateUser({
      account: accounts['USER_5'],
      provider: networks['local'],
    });

    const { token, address } = auth.sessionAuth;

    const newName = `${new Date().getTime()} - Update user test`;
    //update user
    await request(app)
      .put(`/user/${auth.user.id}`)
      .send({
        name: newName,
      })
      .set('Authorization', token)
      .set('Signeraddress', address)
      .then(({ body: data, status }) => {
        expect(status).toBe(200);
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('name');
        expect(data).toHaveProperty('type', TypeUser.FUEL);
        expect(data.name).toBe(newName);
      });
  });

  // test('Update user', async () => {
  //   const auth = await AuthValidations.authenticateUser({
  //     account: accounts['USER_5'],
  //     provider: networks['local'],
  //   });

  //   const newName = `${new Date().getTime()} - Update user test`;
  //   //update user
  //   await auth.axios
  //     .put(`user/${auth.user.id}`, {
  //       name: newName,
  //     })
  //     .then(({ data, status }) => {
  //       expect(status).toBe(200);
  //       expect(data).toHaveProperty('id');
  //       expect(data).toHaveProperty('name');
  //       expect(data).toHaveProperty('type', TypeUser.FUEL);
  //       expect(data.name).toBe(newName);
  //     });
  // });

  test('Update user with existing name', async () => {
    const auth = await AuthValidations.authenticateUser({
      account: accounts['USER_5'],
      provider: networks['local'],
    });

    const _auth = await AuthValidations.authenticateUser({
      account: accounts['USER_4'],
      provider: networks['local'],
    });

    const { token, address } = auth.sessionAuth;
    const { token: _token, address: _address } = _auth.sessionAuth;

    const { body: data } = await request(app)
      .get(`/user/${auth.user.id}`)
      .set('Authorization', token)
      .set('Signeraddress', address);

    //update another user with existing name
    await request(app)
      .put(`/user/${_auth.user.id}`)
      .send({
        name: data.name,
      })
      .set('Authorization', _token)
      .set('Signeraddress', _address)
      .catch(({ response }) => {
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('title', 'Error on user update');
        expect(response.data).toHaveProperty(
          'detail',
          'User with name ' + data.name + ' already exists',
        );
      });
  });

  // test('Update user with existing name', async () => {
  //   const auth = await AuthValidations.authenticateUser({
  //     account: accounts['USER_5'],
  //     provider: networks['local'],
  //   });

  //   const _auth = await AuthValidations.authenticateUser({
  //     account: accounts['USER_4'],
  //     provider: networks['local'],
  //   });

  //   //get name from existing user
  //   const { data } = await auth.axios.get(`user/${auth.user.id}`);

  //   //update another user with existing name
  //   await _auth.axios
  //     .put(`user/${_auth.user.id}`, {
  //       name: data.name,
  //     })
  //     .catch(({ response }) => {
  //       expect(response.status).toBe(400);
  //       expect(response.data).toHaveProperty('title', 'Error on user update');
  //       expect(response.data).toHaveProperty(
  //         'detail',
  //         'User with name ' + data.name + ' already exists',
  //       );
  //     });
  // });

  test('Inválid update user', async () => {
    const auth = await AuthValidations.authenticateUser({
      account: accounts['USER_5'],
      provider: networks['local'],
    });

    const _auth = await AuthValidations.authenticateUser({
      account: accounts['USER_4'],
      provider: networks['local'],
    });

    const { token, address } = _auth.sessionAuth;

    //update user
    await request(app)
      .put(`/user/${auth.user.id}`)
      .send({
        name: '',
      })
      .set('Authorization', token)
      .set('Signeraddress', address)
      .catch(({ response }) => {
        expect(response.status).toBe(401);
        expect(response.data).toHaveProperty('title', 'Invalid permission');
      });
  });

  // test('Inválid update user', async () => {
  //   const auth = await AuthValidations.authenticateUser({
  //     account: accounts['USER_5'],
  //     provider: networks['local'],
  //   });

  //   const _auth = await AuthValidations.authenticateUser({
  //     account: accounts['USER_4'],
  //     provider: networks['local'],
  //   });

  //   //update user
  //   await _auth.axios
  //     .put(`user/${auth.user.id}`, {
  //       name: '',
  //     })
  //     .catch(({ response }) => {
  //       expect(response.status).toBe(401);
  //       expect(response.data).toHaveProperty('title', 'Invalid permission');
  //     });
  // });

  // if recives an object with type, the name is already in use
  test(
    'Validate existing name',
    async () => {
      const name = `${new Date().getTime()} - Create user test`;
      const type = TypeUser.FUEL;
      const address = Address.fromRandom();

      await request(app)
        .post('/user/')
        .send({
          name,
          type,
          address: address.toAddress(),
          provider: networks['local'],
        })
        .then(async () => {
          //verify existing name
          await request(app)
            .get(`/user/nickname/${name}`)
            .then(({ body: data, status }) => {
              expect(status).toBe(200);
              expect(data).toStrictEqual({ type });
            });

          //verify not existing name
          await request(app)
            .get(`/user/nickname/${crypto.randomUUID()}`)
            .then(({ body: data, status }) => {
              expect(status).toBe(200);
              expect(data).toStrictEqual({});
            });
        });
    },
    3 * 1000,
  );

  //  // if recives an object with type, the name is already in use
  //   test(
  //     'Validate existing name',
  //     async () => {
  //       const name = `${new Date().getTime()} - Create user test`;
  //       const type = TypeUser.FUEL;
  //       const address = Address.fromRandom();

  //       await api
  //         .post('/user/', {
  //           name,
  //           type,
  //           address: address.toAddress(),
  //           provider: networks['local'],
  //         })
  //         .then(async () => {
  //           //verify existing name
  //           await api.get(`/user/nickname/${name}`).then(({ data, status }) => {
  //             expect(status).toBe(200);
  //             expect(data).toStrictEqual({ type });
  //           });

  //           //verify not existing name
  //           await api
  //             .get(`/user/nickname/${crypto.randomUUID()}`)
  //             .then(({ data, status }) => {
  //               expect(status).toBe(200);
  //               expect(data).toStrictEqual({});
  //             });
  //         });
  //     },
  //     3 * 1000,
  //   );

  test('Get token usd amount endpoint', async () => {
    const auth = await AuthValidations.authenticateUser({
      account: accounts['USER_5'],
      provider: networks['local'],
    });

    const { token, address } = auth.sessionAuth;

    //list all tokensIDS and usd quote,
    await request(app)
      .get('/user/latest/tokens')
      .set('Authorization', token)
      .set('Signeraddress', address)
      .then(({ body: data, status }) => {
        expect(status).toBe(200);
        expect(data).toBeInstanceOf(Array);
      });
  });

  // test('Get token usd amount endpoint', async () => {
  //   const auth = await AuthValidations.authenticateUser({
  //     account: accounts['USER_5'],
  //     provider: networks['local'],
  //   });

  //   //list all tokensIDS and usd quote,
  //   await auth.axios.get('user/latest/tokens').then(({ data, status }) => {
  //     expect(status).toBe(200);
  //     expect(data).toBeInstanceOf(Array);
  //   });
  // });
});
