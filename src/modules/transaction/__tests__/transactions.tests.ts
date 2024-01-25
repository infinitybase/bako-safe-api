import { Address } from 'fuels';

import { accounts } from '@src/mocks/accounts';
import { networks } from '@src/mocks/networks';
import { PredicateMock } from '@src/mocks/predicate';
import { transaction, transactionMock } from '@src/mocks/transaction';
import { AuthValidations } from '@src/utils/testUtils/Auth';
import { generateWorkspacePayload } from '@src/utils/testUtils/Workspace';

describe('[TRANSACTION]', () => {
  let api: AuthValidations;
  beforeAll(async () => {
    api = new AuthValidations(networks['local'], accounts['USER_1']);

    await api.create();
    await api.createSession();
  });

  test('TX', () => undefined);
  //   'Create transaction',
  //   async () => {
  //     const user_aux = Address.fromRandom().toString();
  //     const members = [accounts['USER_1'].address, user_aux];
  //     const { predicatePayload, vault } = await PredicateMock.create(1, members);
  //     await api.axios.post('/predicate', predicatePayload);

  //     const { tx, payload_transfer } = await transactionMock(vault);
  //     const { data: data_transaction } = await api.axios.post(
  //       '/transaction',
  //       payload_transfer,
  //     );

  //     expect(data_transaction).toHaveProperty('id');
  //     expect(data_transaction).toHaveProperty(
  //       'predicate.predicateAddress',
  //       vault.address.toString(),
  //     );
  //     expect(data_transaction).toHaveProperty('witnesses');
  //     expect(data_transaction.witnesses).toHaveLength(members.length);
  //     expect(data_transaction).toHaveProperty('assets');
  //     expect(tx.getHashTxId()).toEqual(data_transaction.hash);
  //   },
  //   60 * 1000,
  // );

  // test(
  //   'Create transaction with invalid permission',
  //   async () => {
  //     // logar com usuário inválido no workspace
  //     const auth = new AuthValidations(networks['local'], accounts['USER_3']);
  //     await auth.create();
  //     await auth.createSession();
  //     const {
  //       data,
  //       status,
  //       data_user1,
  //       data_user2,
  //       USER_5,
  //     } = await generateWorkspacePayload(auth);

  //     //gerar um predicate
  //     const members = [data_user1.address, data_user2.address, USER_5.address];

  //     const { predicatePayload, vault } = await PredicateMock.create(1, members);
  //     await api.axios.post('/predicate', predicatePayload);

  //     //gerar uma transacao com um usuário inválido
  //     const { payload_transfer } = await transactionMock(vault);
  //     const {
  //       status: status_transaction,
  //       data: data_transaction,
  //     } = await auth.axios.post('/transaction', payload_transfer).catch(e => {
  //       return e.response;
  //     });

  //     //validacoes
  //     expect(status_transaction).toBe(401);
  //     expect(data_transaction).toHaveProperty(
  //       'detail',
  //       'You do not have permission to access this resource',
  //     );
  //   },
  //   60 * 1000,
  // );

  // test(
  //   'Create transaction with vault member',
  //   async () => {
  //     // logar com usuário inválido no workspace
  //     const auth = new AuthValidations(networks['local'], accounts['USER_5']);
  //     await auth.create();
  //     await auth.createSession();
  //     const {
  //       data,
  //       status,
  //       data_user1,
  //       data_user2,
  //       USER_5,
  //     } = await generateWorkspacePayload(auth);

  //     //gerar um predicate
  //     const members = [data_user1.address, data_user2.address, USER_5.address];

  //     const { predicatePayload, vault } = await PredicateMock.create(1, members);
  //     await api.axios.post('/predicate', predicatePayload);

  //     //gerar uma transacao com um usuário inválido
  //     const { payload_transfer } = await transactionMock(vault);
  //     const {
  //       status: status_transaction,
  //       data: data_transaction,
  //     } = await auth.axios.post('/transaction', payload_transfer);

  //     //validacoes
  //     expect(status_transaction).toBe(200);
  //   },
  //   60 * 1000,
  // );
});
