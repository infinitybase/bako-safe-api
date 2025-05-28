import { AuthValidations } from '@utils/testUtils/Auth';
import { TestError, catchApplicationError } from '@utils/testUtils/Errors';
import { SetupApi } from '@src/utils/testUtils/setup';

import { Predicate, Encoder } from '@src/models';
import { networks } from '@src/mocks/networks';
import { IPredicatePayload } from '@src/modules/predicate/types';
import { FuelProvider } from '@src/utils';
import axios from 'axios';
import { TypeUser, Vault } from 'bakosafe';
import { Wallet, Address } from 'fuels';
import { accounts } from '@src/mocks/accounts';
import Express from 'express';
import request from 'supertest';
import App from '@src/server/app';
import * as http from 'http';
import Bootstrap from '@src/server/bootstrap';

const { API_URL } = process.env;

const tokenMock = {
  name: 'Test API Token',
  config: {
    transactionTitle: 'BakoSafe contract deployment',
  },
};

describe('[API TOKEN]', () => {
  let app: Express.Application;
  let server: http.Server;
  let api: AuthValidations;
  let predicate: Predicate;
  // let notWorkspaceMemberApi: AuthValidations;
  // let notFoundPermissionApi: AuthValidations;

  beforeAll(async () => {
    const appInstance = await App.start();
    app = appInstance.serverApp;
    server = app.listen(0);

    const setup = await SetupApi.setup();

    //await FuelProvider.start();

    api = setup.api;
    predicate = setup.predicate;
    // notWorkspaceMemberApi = setup.notWorkspaceMemberApi;
    // notFoundPermissionApi = setup.notFoundPermissionApi;
    console.log('>>> api tokenn', api.axios.defaults.headers);
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close(err => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('Server closed');

    console.log('Stopping bootstrap...');
    await Bootstrap.stop();
    console.log('Bootstrap stopped');

    console.log('TEST CLEANUP COMPLETE');

    // const activeHandles = process._getActiveHandles(); // cuidado: método não-documentado
    // const activeRequests = process._getActiveRequests();

    // console.log('>>> Active Handles:', activeHandles);
    // console.log('>>> Active Requests:', activeRequests);
  });

  it('should handle the TOKEN strategy correctly', async () => {
    const provider = await FuelProvider.create(networks['local']);

    // create a new user
    const wallet = Wallet.generate();
    const address = wallet.address.toB256();

    const newUser = {
      address,
      provider: networks['local'],
      name: `test mock - ${Address.fromRandom().toB256()}`,
      type: TypeUser.FUEL,
    };

    // create a new user, and recive a new code to sign-in
    const { body: user } = await request(app).post('/user').send(newUser);
    expect(user).toHaveProperty('code');

    // sign message code
    const token = await Wallet.fromPrivateKey(wallet.privateKey).signMessage(
      user.code,
    );

    // sign-in with code
    const { body: session } = await request(app).post('/auth/sign-in').send({
      digest: user.code,
      encoder: Encoder.FUEL,
      signature: token,
      userAddress: address,
    });

    // create a new predicate, we dont need send a version
    const predicate = new Vault(provider, {
      SIGNATURES_COUNT: 1,
      SIGNERS: [wallet.address.toB256()],
    });
    const payload: IPredicatePayload = {
      name: `mock name ${Address.fromRandom().toB256()}`,
      description: '',
      predicateAddress: predicate.address.toB256(),
      configurable: JSON.stringify(predicate.configurable),
    };

    const { body: predicateSaved } = await request(app)
      .post('/predicate')
      .send(payload)
      .set('Authorization', session.accessToken)
      .set('Signeraddress', address);

    const { body: apiTokenWithTitle } = await request(app)
      .post(`/api-token/${predicateSaved.id}`)
      .send(tokenMock)
      .set('Authorization', session.accessToken)
      .set('Signeraddress', address);

    expect(apiTokenWithTitle).toHaveProperty('token');
    expect(apiTokenWithTitle).toHaveProperty('name', tokenMock.name);
    expect(apiTokenWithTitle).toHaveProperty('network.url', provider.url);
    expect(apiTokenWithTitle).toHaveProperty(
      'network.chainId',
      await provider.getChainId(),
    );
  });

  // it('should handle the TOKEN strategy correctly', async () => {
  //   const api = axios.create({
  //     baseURL: API_URL,
  //   });
  //   const provider = await FuelProvider.create(networks['local']);

  //   // create a new user
  //   const wallet = Wallet.generate();
  //   const address = wallet.address.toB256();

  //   const newUser = {
  //     address,
  //     provider: networks['local'],
  //     name: `test mock - ${Address.fromRandom().toB256()}`,
  //     type: TypeUser.FUEL,
  //   };

  //   // create a new user, and recive a new code to sign-in
  //   const { data: user } = await api.post(`/user`, newUser);
  //   expect(user).toHaveProperty('code');

  //   // sign message code
  //   const token = await Wallet.fromPrivateKey(wallet.privateKey).signMessage(
  //     user.code,
  //   );

  //   // sign-in with code
  //   const { data: session } = await api.post(`/auth/sign-in`, {
  //     encoder: Encoder.FUEL,
  //     signature: token,
  //     digest: user.code,
  //     userAddress: address,
  //   });

  //   api.defaults.headers.common['Authorization'] = session.accessToken;
  //   api.defaults.headers.common['Signeraddress'] = address;

  //   // create a new predicate, we dont need send a version
  //   const predicate = new Vault(provider, {
  //     SIGNATURES_COUNT: 1,
  //     SIGNERS: [wallet.address.toB256()],
  //   });
  //   const payload: IPredicatePayload = {
  //     name: `mock name ${Address.fromRandom().toB256()}`,
  //     description: '',
  //     predicateAddress: predicate.address.toB256(),
  //     configurable: JSON.stringify(predicate.configurable),
  //   };

  //   const { data: predicateSaved } = await api.post(`/predicate`, payload);

  //   const { data: apiTokenWithTitle } = await api.post(
  //     `/api-token/${predicateSaved.id}`,
  //     tokenMock,
  //   );

  //   expect(apiTokenWithTitle).toHaveProperty('token');
  //   expect(apiTokenWithTitle).toHaveProperty('name', tokenMock.name);
  //   expect(apiTokenWithTitle).toHaveProperty('network.url', provider.url);
  //   expect(apiTokenWithTitle).toHaveProperty(
  //     'network.chainId',
  //     await provider.getChainId(),
  //   );
  // });
  //});

  // describe('[API TOKEN]', () => {
  //   let app: Express.Application;
  //   let server: http.Server;
  //   let api: AuthValidations;
  //   let predicate: Predicate;
  //   // let notWorkspaceMemberApi: AuthValidations;
  //   // let notFoundPermissionApi: AuthValidations;

  //   beforeAll(async () => {
  //     const appInstance = await App.start();
  //     app = appInstance.serverApp;
  //     server = app.listen(0);

  //     const setup = await SetupApi.setup();

  //     //await FuelProvider.start();

  //     api = setup.api;
  //     predicate = setup.predicate;
  //     // notWorkspaceMemberApi = setup.notWorkspaceMemberApi;
  //     // notFoundPermissionApi = setup.notFoundPermissionApi;
  //     console.log('>>> api tokenn', api.axios.defaults.headers);
  //   });

  describe('Create', () => {
    test(
      'Create a api token for vault',
      async () => {
        const { body: apiTokenWithTitle } = await request(app)
          .post(`/api-token/${predicate.id}`)
          .send(tokenMock)
          .set('Authorization', api.sessionAuth.token)
          .set('Signeraddress', api.sessionAuth.address);

        expect(apiTokenWithTitle.token).toBeDefined();
        expect(apiTokenWithTitle.name).toBe(tokenMock.name);
        expect(apiTokenWithTitle.config.transactionTitle).toBe(
          tokenMock.config.transactionTitle,
        );

        const { body: apiTokenWithoutTitle } = await request(app)
          .post(`/api-token/${predicate.id}`)
          .send({ ...tokenMock, config: undefined })
          .set('Authorization', api.sessionAuth.token)
          .set('Signeraddress', api.sessionAuth.address);

        expect(apiTokenWithoutTitle.id).toBeDefined();
        expect(apiTokenWithoutTitle.token).toBeDefined();
        expect(apiTokenWithoutTitle.name).toBe(tokenMock.name);
        expect(apiTokenWithoutTitle.config.transactionTitle).toBe('');
      },
      10 * 1000,
    );

    // describe('Create', () => {
    //   test(
    //     'Create a api token for vault',
    //     async () => {
    //       console.log('>>> INICIAMOS CRIATE API TOKEN - predicate id', predicate.id);

    //       const { data: apiTokenWithTitle } = await api.axios.post(
    //         `/api-token/${predicate.id}`,
    //         tokenMock,
    //       );

    //       console.log('>>> PASSOU DO CREATE');

    //       expect(apiTokenWithTitle.token).toBeDefined();
    //       expect(apiTokenWithTitle.name).toBe(tokenMock.name);
    //       expect(apiTokenWithTitle.config.transactionTitle).toBe(
    //         tokenMock.config.transactionTitle,
    //       );

    //       const { data: apiTokenWithoutTitle } = await api.axios.post(
    //         `/api-token/${predicate.id}`,
    //         {
    //           ...tokenMock,
    //           config: undefined,
    //         },
    //       );

    //       expect(apiTokenWithoutTitle.id).toBeDefined();
    //       expect(apiTokenWithoutTitle.token).toBeDefined();
    //       expect(apiTokenWithoutTitle.name).toBe(tokenMock.name);
    //       expect(apiTokenWithoutTitle.config.transactionTitle).toBe('');
    //     },
    //     10 * 1000,
    //   );

    test('Body and params on create api token', async () => {
      // Error on missing required fields
      const payloadError = await catchApplicationError(
        request(app)
          .post(`/api-token/${predicate.id}`)
          .send({})
          .set('Authorization', api.sessionAuth.token)
          .set('Signeraddress', api.sessionAuth.address),
      );
      TestError.expectValidation(payloadError, {
        type: 'any.required',
        field: 'name',
        origin: 'body',
      });

      const predicateError = await catchApplicationError(
        request(app)
          .post(`/api-token/invalid-id`)
          .send(tokenMock)
          .set('Authorization', api.sessionAuth.token)
          .set('Signeraddress', api.sessionAuth.address),
      );
      TestError.expectValidation(predicateError, {
        type: 'string.guid',
        field: 'predicateId',
        origin: 'params',
      });
    });

    // test('Body and params on create api token', async () => {
    //   // Error on missing required fields
    //   const payloadError = await catchApplicationError(
    //     api.axios.post(`/api-token/${predicate.id}`, {}),
    //   );
    //   TestError.expectValidation(payloadError, {
    //     type: 'any.required',
    //     field: 'name',
    //     origin: 'body',
    //   });

    //   // Error on invalid predicate id
    //   const predicateError = await catchApplicationError(
    //     api.axios.post(`/api-token/invalid-id`, tokenMock),
    //   );
    //   TestError.expectValidation(predicateError, {
    //     type: 'string.guid',
    //     field: 'predicateId',
    //     origin: 'params',
    //   });
    // });

    test('Permissions on create api token', async () => {
      // Error on not found predicate
      const notFoundError = await catchApplicationError(
        request(app)
          .post(`/api-token/9328ed43-31c7-428a-bb73-c03534bf34f0`)
          .send(tokenMock)
          .set('Authorization', api.sessionAuth.token)
          .set('Signeraddress', api.sessionAuth.address),
      );
      TestError.expectNotFound(notFoundError);

      // Error on not allowed predicate
      const auth = await AuthValidations.authenticateUser({
        account: accounts['USER_2'],
        provider: networks['local'],
      });

      const notPredicateOwnerError = await catchApplicationError(
        request(app)
          .post(`/api-token/${predicate.id}`)
          .send(tokenMock)
          .set('Authorization', auth.sessionAuth.token ?? '')
          .set('Signeraddress', auth.sessionAuth.address ?? ''),
      );
      TestError.expectUnauthorized(notPredicateOwnerError);

      // Error on not allowed predicate
      // const notFoundPermissionError = await catchApplicationError(
      //   notFoundPermissionApi.axios.post(`/api-token/${predicate.id}`, tokenMock),
      // );
      // TestError.expectUnauthorized(notFoundPermissionError);
      //});
    });

    // test('Permissions on create api token', async () => {
    //   // Error on not found predicate
    //   const notFoundError = await catchApplicationError(
    //     api.axios.post(
    //       `/api-token/9328ed43-31c7-428a-bb73-c03534bf34f0`,
    //       tokenMock,
    //     ),
    //   );
    //   TestError.expectNotFound(notFoundError);

    //   // Error on not allowed predicate
    //   const auth = await AuthValidations.authenticateUser({
    //     account: accounts['USER_2'],
    //     provider: networks['local'],
    //   });

    //   const notPredicateOwnerError = await catchApplicationError(
    //     auth.axios.post(`/api-token/${predicate.id}`, tokenMock),
    //   );
    //   TestError.expectUnauthorized(notPredicateOwnerError);

    //   // const notWorkspaceMemberError = await catchApplicationError(
    //   //   notWorkspaceMemberApi.axios.post(`/api-token/${predicate.id}`, tokenMock),
    //   // );
    //   // TestError.expectUnauthorized(notWorkspaceMemberError);

    //   //Error on not allowed predicate
    //   // const notFoundPermissionError = await catchApplicationError(
    //   //   notFoundPermissionApi.axios.post(`/api-token/${predicate.id}`, tokenMock),
    //   // );
    //   // TestError.expectUnauthorized(notFoundPermissionError);
    //   // });
    // });

    describe('Delete', () => {
      test('Delete a api token', async () => {
        const { body: apiToken } = await request(app)
          .post(`/api-token/${predicate.id}`)
          .send(tokenMock)
          .set('Authorization', api.sessionAuth.token)
          .set('Signeraddress', api.sessionAuth.address);

        const { body: data, status } = await request(app)
          .delete(`/api-token/${predicate.id}/${apiToken.id}`)
          .set('Authorization', api.sessionAuth.token)
          .set('Signeraddress', api.sessionAuth.address);

        expect(data).toBeNull();
        expect(status).toBe(201);
      });

      test('Not predicate owner', async () => {
        const { body: apiToken } = await request(app)
          .post(`/api-token/${predicate.id}`)
          .send(tokenMock)
          .set('Authorization', api.sessionAuth.token)
          .set('Signeraddress', api.sessionAuth.address);

        const auth = await AuthValidations.authenticateUser({
          account: accounts['USER_2'],
          provider: networks['local'],
        });

        const notPredicateOwnerError = await catchApplicationError(
          request(app)
            .delete(`/api-token/${predicate.id}/${apiToken.id}`)
            .set('Authorization', auth.sessionAuth.token ?? '')
            .set('Signeraddress', auth.sessionAuth.address ?? ''),
        );

        TestError.expectUnauthorized(notPredicateOwnerError);
      });
    });

    // describe('Delete', () => {
    //   test('Delete a api token', async () => {
    //     const { data: apiToken } = await api.axios.post(
    //       `/api-token/${predicate.id}`,
    //       tokenMock,
    //     );

    //     const { data, status } = await api.axios.delete(
    //       `/api-token/${predicate.id}/${apiToken.id}`,
    //     );
    //     expect(data).toBeNull();
    //     expect(status).toBe(201);
    //   });

    //   test('Not predicate owner', async () => {
    //     const { data: apiToken } = await api.axios.post(
    //       `/api-token/${predicate.id}`,
    //       tokenMock,
    //     );

    //     const auth = await AuthValidations.authenticateUser({
    //       account: accounts['USER_2'],
    //       provider: networks['local'],
    //     });

    //     const notPredicateOwnerError = await catchApplicationError(
    //       auth.axios.delete(`/api-token/${predicate.id}/${apiToken.id}`),
    //     );
    //     TestError.expectUnauthorized(notPredicateOwnerError);
    //   });
    // });

    //   // test('Not a member of workspace', async () => {
    //   //   const { data: apiToken } = await api.axios.post(
    //   //     `/api-token/${predicate.id}`,
    //   //     tokenMock,
    //   //   );

    //   //   const notWorkspaceMemberError = await catchApplicationError(
    //   //     notWorkspaceMemberApi.axios.delete(
    //   //       `/api-token/${predicate.id}/${apiToken.id}`,
    //   //     ),
    //   //   );
    //   //   TestError.expectUnauthorized(notWorkspaceMemberError);
    //   // });

    //   // test('Not found permission in workspace', async () => {
    //   //   const { data: apiToken } = await api.axios.post(
    //   //     `/api-token/${predicate.id}`,
    //   //     tokenMock,
    //   //   );

    //   //   // Error on not allowed predicate
    //   //   const notFoundPermissionError = await catchApplicationError(
    //   //     notFoundPermissionApi.axios.delete(
    //   //       `/api-token/${predicate.id}/${apiToken.id}`,
    //   //     ),
    //   //   );
    //   //   TestError.expectUnauthorized(notFoundPermissionError);
    //   // });
    // });

    describe('List', () => {
      test('List api tokens', async () => {
        await request(app)
          .post(`/api-token/${predicate.id}`)
          .send(tokenMock)
          .set('Authorization', api.sessionAuth.token)
          .set('Signeraddress', api.sessionAuth.address);

        const { body: data } = await request(app)
          .get(`/api-token/${predicate.id}`)
          .set('Authorization', api.sessionAuth.token)
          .set('Signeraddress', api.sessionAuth.address);
        const [token] = data;

        expect(token.id).toBeDefined();
        expect(token.token).not.toBeDefined();
      });

      test('Not predicate owner', async () => {
        const auth = await AuthValidations.authenticateUser({
          account: accounts['USER_2'],
          provider: networks['local'],
        });

        const notPredicateOwnerError = await catchApplicationError(
          request(app)
            .get(`/api-token/${predicate.id}`)
            .set('Authorization', auth.sessionAuth.token ?? '')
            .set('Signeraddress', auth.sessionAuth.address ?? ''),
        );
        TestError.expectUnauthorized(notPredicateOwnerError);
      });

      // test('Not a member of workspace', async () => {
      //   const notWorkspaceMemberError = await catchApplicationError(
      //     notWorkspaceMemberApi.axios.get(`/api-token/${predicate.id}`),
      //   );

      //   TestError.expectUnauthorized(notWorkspaceMemberError);
      // });

      // test('Not found permission in workspace', async () => {
      //   const notFoundPermissionError = await catchApplicationError(
      //     notFoundPermissionApi.axios.get(`/api-token/${predicate.id}`),
      //   );

      //   TestError.expectUnauthorized(notFoundPermissionError);
      // });
    });

    // describe('List', () => {
    //   test('List api tokens', async () => {
    //     await api.axios.post(`/api-token/${predicate.id}`, tokenMock);

    //     const { data } = await api.axios.get(`/api-token/${predicate.id}`);
    //     const [token] = data;

    //     expect(token.id).toBeDefined();
    //     expect(token.token).not.toBeDefined();
    //   });

    //   test('Not predicate owner', async () => {
    //     const auth = await AuthValidations.authenticateUser({
    //       account: accounts['USER_2'],
    //       provider: networks['local'],
    //     });

    //     const notPredicateOwnerError = await catchApplicationError(
    //       auth.axios.get(`/api-token/${predicate.id}`),
    //     );
    //     TestError.expectUnauthorized(notPredicateOwnerError);
    //   });

    //   // test('Not a member of workspace', async () => {
    //   //   const notWorkspaceMemberError = await catchApplicationError(
    //   //     notWorkspaceMemberApi.axios.get(`/api-token/${predicate.id}`),
    //   //   );

    //   //   TestError.expectUnauthorized(notWorkspaceMemberError);
    //   // });

    //   // test('Not found permission in workspace', async () => {
    //   //   const notFoundPermissionError = await catchApplicationError(
    //   //     notFoundPermissionApi.axios.get(`/api-token/${predicate.id}`),
    //   //   );

    //   //   TestError.expectUnauthorized(notFoundPermissionError);
    //   // });
    // });
  });
});
