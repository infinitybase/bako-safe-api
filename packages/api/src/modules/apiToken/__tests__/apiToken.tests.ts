// import { AuthValidations } from '@utils/testUtils/Auth';
// import { DEFAULT_TRANSACTION_TITLE, Predicate } from '@src/models';
// import { TestError, catchApplicationError } from '@utils/testUtils/Errors';
// // import { SetupApi } from '@src/utils/testUtils/setup';

import { networks } from '@src/mocks/networks';
import { Encoder } from '@src/models';
import { IPredicatePayload } from '@src/modules/predicate/types';
import axios from 'axios';
import { TypeUser, Vault } from 'bakosafe';
import { Provider, Wallet, Address } from 'fuels';
const { API_URL } = process.env;

const tokenMock = {
  name: 'Test API Token',
  config: {
    transactionTitle: 'BakoSafe contract deployment',
  },
};

describe('[API TOKEN]', () => {
  it('should handle the TOKEN strategy correctly', async () => {
    const api = axios.create({
      baseURL: API_URL,
    });
    const provider = await Provider.create(networks['local']);

    // create a new user
    const wallet = Wallet.generate();
    const newUser = {
      address: wallet.address.toB256(),
      provider: networks['local'],
      name: `test mock - ${Address.fromRandom().toB256()}`,
      type: TypeUser.FUEL,
    };

    // create a new user, and recive a new code to sign-in
    const { data: user } = await api.post(`/user`, newUser);
    expect(user).toHaveProperty('code');

    // sign message code
    const token = await Wallet.fromPrivateKey(wallet.privateKey).signMessage(
      user.code,
    );

    // sign-in with code
    const { data: session } = await api.post(`/auth/sign-in`, {
      encoder: Encoder.FUEL,
      signature: token,
      digest: user.code,
    });

    api.defaults.headers.common['Authorization'] = session.accessToken;
    api.defaults.headers.common['Signeraddress'] = provider.url;

    // create a new predicate
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

    const { data: predicateSaved } = await api.post(`/predicate`, payload);

    const { data: apiTokenWithTitle } = await api.post(
      `/api-token/${predicateSaved.id}`,
      tokenMock,
    );

    expect(apiTokenWithTitle).toHaveProperty('token');
    expect(apiTokenWithTitle).toHaveProperty('name', tokenMock.name);
    expect(apiTokenWithTitle).toHaveProperty('network.url', provider.url);
    expect(apiTokenWithTitle).toHaveProperty(
      'network.chainId',
      provider.getChainId(),
    );
  });
});

// describe('[API TOKEN]', () => {
//   let api: AuthValidations;
//   let predicate: Predicate;
//   let notWorkspaceMemberApi: AuthValidations;
//   let notFoundPermissionApi: AuthValidations;

//   beforeAll(async () => {
//     const setup = await SetupApi.setup();

//     api = setup.api;
//     predicate = setup.predicate;
//     notWorkspaceMemberApi = setup.notWorkspaceMemberApi;
//     notFoundPermissionApi = setup.notFoundPermissionApi;
//   });

//   describe('Create', () => {
//     test(
//       'Create a api token for vault',
//       async () => {
//         const { data: apiTokenWithTitle } = await api.axios.post(
//           `/api-token/${predicate.id}`,
//           tokenMock,
//         );

//         expect(apiTokenWithTitle.token).toBeDefined();
//         expect(apiTokenWithTitle.name).toBe(tokenMock.name);
//         expect(apiTokenWithTitle.config.transactionTitle).toBe(
//           tokenMock.config.transactionTitle,
//         );

//         const { data: apiTokenWithoutTitle } = await api.axios.post(
//           `/api-token/${predicate.id}`,
//           {
//             ...tokenMock,
//             config: undefined,
//           },
//         );

//         expect(apiTokenWithoutTitle.id).toBeDefined();
//         expect(apiTokenWithoutTitle.token).toBeDefined();
//         expect(apiTokenWithoutTitle.name).toBe(tokenMock.name);
//         expect(apiTokenWithoutTitle.config.transactionTitle).toBe(
//           DEFAULT_TRANSACTION_TITLE,
//         );
//       },
//       10 * 1000,
//     );

//     test('Body and params on create api token', async () => {
//       // Error on missing required fields
//       const payloadError = await catchApplicationError(
//         api.axios.post(`/api-token/${predicate.id}`, {}),
//       );
//       TestError.expectValidation(payloadError, {
//         type: 'any.required',
//         field: 'name',
//         origin: 'body',
//       });

//       // Error on invalid predicate id
//       const predicateError = await catchApplicationError(
//         api.axios.post(`/api-token/invalid-id`, tokenMock),
//       );
//       TestError.expectValidation(predicateError, {
//         type: 'string.guid',
//         field: 'predicateId',
//         origin: 'params',
//       });
//     });

//     test('Permissions on create api token', async () => {
//       // Error on not found predicate
//       const notFoundError = await catchApplicationError(
//         api.axios.post(
//           `/api-token/9328ed43-31c7-428a-bb73-c03534bf34f0`,
//           tokenMock,
//         ),
//       );
//       TestError.expectNotFound(notFoundError);

//       // Error on not allowed predicate
//       const notWorkspaceMemberError = await catchApplicationError(
//         notWorkspaceMemberApi.axios.post(`/api-token/${predicate.id}`, tokenMock),
//       );
//       TestError.expectUnauthorized(notWorkspaceMemberError);

//       // Error on not allowed predicate
//       const notFoundPermissionError = await catchApplicationError(
//         notFoundPermissionApi.axios.post(`/api-token/${predicate.id}`, tokenMock),
//       );
//       TestError.expectUnauthorized(notFoundPermissionError);
//     });
//   });

//   describe('Delete', () => {
//     test('Delete a api token', async () => {
//       const { data: apiToken } = await api.axios.post(
//         `/api-token/${predicate.id}`,
//         tokenMock,
//       );

//       const { data, status } = await api.axios.delete(
//         `/api-token/${predicate.id}/${apiToken.id}`,
//       );
//       expect(data).toBeNull();
//       expect(status).toBe(201);
//     });

//     test('Not a member of workspace', async () => {
//       const { data: apiToken } = await api.axios.post(
//         `/api-token/${predicate.id}`,
//         tokenMock,
//       );

//       const notWorkspaceMemberError = await catchApplicationError(
//         notWorkspaceMemberApi.axios.delete(
//           `/api-token/${predicate.id}/${apiToken.id}`,
//         ),
//       );
//       TestError.expectUnauthorized(notWorkspaceMemberError);
//     });

//     test('Not found permission in workspace', async () => {
//       const { data: apiToken } = await api.axios.post(
//         `/api-token/${predicate.id}`,
//         tokenMock,
//       );

//       // Error on not allowed predicate
//       const notFoundPermissionError = await catchApplicationError(
//         notFoundPermissionApi.axios.delete(
//           `/api-token/${predicate.id}/${apiToken.id}`,
//         ),
//       );
//       TestError.expectUnauthorized(notFoundPermissionError);
//     });
//   });

//   describe('List', () => {
//     test('List api tokens', async () => {
//       await api.axios.post(`/api-token/${predicate.id}`, tokenMock);

//       const { data } = await api.axios.get(`/api-token/${predicate.id}`);
//       const [token] = data;

//       expect(token.id).toBeDefined();
//       expect(token.token).not.toBeDefined();
//     });

//     test('Not a member of workspace', async () => {
//       const notWorkspaceMemberError = await catchApplicationError(
//         notWorkspaceMemberApi.axios.get(`/api-token/${predicate.id}`),
//       );

//       TestError.expectUnauthorized(notWorkspaceMemberError);
//     });

//     test('Not found permission in workspace', async () => {
//       const notFoundPermissionError = await catchApplicationError(
//         notFoundPermissionApi.axios.get(`/api-token/${predicate.id}`),
//       );

//       TestError.expectUnauthorized(notFoundPermissionError);
//     });
//   });
// });
